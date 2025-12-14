import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Order, OrderStatus, OrderType } from './entities/order.entity';
import { Trade } from './entities/trade.entity';
import { CreateOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly matchingEngineUrl: string;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    private readonly configService: ConfigService,
  ) {
    this.matchingEngineUrl = this.configService.get('MATCHING_ENGINE_URL', 'http://matching-engine:3010');
  }

  /**
   * Create and submit a new order
   */
  async createOrder(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    // Validate order
    if (createOrderDto.type === OrderType.LIMIT && !createOrderDto.price) {
      throw new BadRequestException('Price is required for limit orders');
    }

    // Get pair ID from symbol (would call pairs service in production)
    const pairId = await this.getPairId(createOrderDto.symbol);

    // Create order in database
    const order = this.orderRepository.create({
      userId,
      pairId,
      side: createOrderDto.side,
      type: createOrderDto.type,
      price: createOrderDto.price || null,
      quantity: createOrderDto.quantity,
      remainingQuantity: createOrderDto.quantity,
      stopPrice: createOrderDto.stopPrice || null,
      timeInForce: createOrderDto.timeInForce,
      clientOrderId: createOrderDto.clientOrderId || null,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Submit to matching engine
    try {
      const response = await axios.post(`${this.matchingEngineUrl}/api/v1/orders`, {
        id: savedOrder.id,
        userId,
        symbol: createOrderDto.symbol,
        side: createOrderDto.side,
        type: createOrderDto.type,
        price: createOrderDto.price,
        quantity: createOrderDto.quantity,
        stopPrice: createOrderDto.stopPrice,
        timeInForce: createOrderDto.timeInForce,
        clientOrderId: createOrderDto.clientOrderId,
      });

      // Update order with result from matching engine
      const { order: matchedOrder, trades } = response.data;
      
      savedOrder.status = matchedOrder.status;
      savedOrder.filledQuantity = matchedOrder.filledQuantity;
      savedOrder.remainingQuantity = matchedOrder.remainingQuantity;
      
      await this.orderRepository.save(savedOrder);

      // Save trades
      if (trades && trades.length > 0) {
        await this.saveTrades(trades, pairId);
      }

      this.logger.log(`Order created: ${savedOrder.id}, status: ${savedOrder.status}`);
    } catch (error) {
      this.logger.error('Failed to submit to matching engine', error);
      savedOrder.status = OrderStatus.REJECTED;
      await this.orderRepository.save(savedOrder);
    }

    return savedOrder;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(userId: string, orderId: string, symbol: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order cannot be cancelled');
    }

    try {
      await axios.delete(`${this.matchingEngineUrl}/api/v1/orders/${orderId}?symbol=${symbol}`);
    } catch (error) {
      this.logger.error('Failed to cancel at matching engine', error);
    }

    order.status = OrderStatus.CANCELLED;
    return this.orderRepository.save(order);
  }

  /**
   * Get order by ID
   */
  async getOrder(userId: string, orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  /**
   * Get user's orders
   */
  async getUserOrders(
    userId: string,
    options: { status?: OrderStatus; pairId?: string; page?: number; limit?: number },
  ): Promise<{ items: Order[]; total: number }> {
    const { status, pairId, page = 1, limit = 20 } = options;

    const query = this.orderRepository
      .createQueryBuilder('order')
      .where('order.user_id = :userId', { userId })
      .orderBy('order.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      query.andWhere('order.status = :status', { status });
    }
    if (pairId) {
      query.andWhere('order.pair_id = :pairId', { pairId });
    }

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  /**
   * Get open orders
   */
  async getOpenOrders(userId: string, symbol?: string): Promise<Order[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .where('order.user_id = :userId', { userId })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [OrderStatus.OPEN, OrderStatus.PARTIAL],
      })
      .orderBy('order.created_at', 'DESC');

    return query.getMany();
  }

  /**
   * Get user's trade history
   */
  async getUserTrades(
    userId: string,
    options: { pairId?: string; page?: number; limit?: number },
  ): Promise<{ items: Trade[]; total: number }> {
    const { pairId, page = 1, limit = 50 } = options;

    const query = this.tradeRepository
      .createQueryBuilder('trade')
      .where('(trade.buyer_id = :userId OR trade.seller_id = :userId)', { userId })
      .orderBy('trade.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (pairId) {
      query.andWhere('trade.pair_id = :pairId', { pairId });
    }

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  // Helper methods
  private async getPairId(symbol: string): Promise<string> {
    // In production, this would query the pairs table/service
    // For now, return a placeholder
    return 'placeholder-pair-id';
  }

  private async saveTrades(trades: any[], pairId: string): Promise<void> {
    for (const trade of trades) {
      const tradeEntity = this.tradeRepository.create({
        id: trade.id,
        pairId,
        buyerOrderId: trade.buyerOrderId,
        sellerOrderId: trade.sellerOrderId,
        buyerId: trade.buyerId,
        sellerId: trade.sellerId,
        price: trade.price,
        quantity: trade.quantity,
        isBuyerMaker: trade.isBuyerMaker,
      });
      await this.tradeRepository.save(tradeEntity);
    }
  }
}
