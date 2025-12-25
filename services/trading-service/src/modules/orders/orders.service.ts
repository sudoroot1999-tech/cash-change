import { Injectable, BadRequestException, NotFoundException, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RABBITMQ } from '@exchange/common';
import { Order, OrderStatus, OrderType, TimeInForce } from './entities/order.entity';
import { Trade } from './entities/trade.entity';
import { CreateOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);
  private walletService: any;
  private matchingService: any;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @Inject('WALLET_PACKAGE') private readonly client: ClientGrpc,
    @Inject('MATCHING_PACKAGE') private readonly matchingClient: ClientGrpc,
    @Inject('MARKET_PACKAGE') private readonly marketClient: ClientGrpc,
    @Inject('TRADING_PACKAGE') private readonly rmqClient: ClientProxy,
  ) {}

  private marketService: any;

  onModuleInit() {
    this.walletService = this.client.getService<any>('WalletService');
    this.matchingService = this.matchingClient.getService<any>('MatchingService');
    this.marketService = this.marketClient.getService<any>('MarketService');
  }

  async getMarkets() {
    return this.marketService.getAllTickers({}).toPromise();
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
    const assetId = createOrderDto.symbol.split('/')[0]; // Simple assumption: first part of symbol is the asset to lock

    // Lock balance via gRPC
    const amountToLock = parseFloat(createOrderDto.price || '0') * parseFloat(createOrderDto.quantity);
    const lockResult = await this.walletService.lockBalance({
      user_id: userId,
      asset_id: assetId,
      amount: amountToLock.toString(),
    }).toPromise();

    if (!lockResult.success) {
      throw new BadRequestException(`Failed to lock balance: ${lockResult.message}`);
    }

    // Create order in database
    const order: Order = this.orderRepository.create({
      userId,
      pairId,
      side: createOrderDto.side,
      type: createOrderDto.type,
      price: createOrderDto.price ?? null,
      quantity: createOrderDto.quantity,
      remainingQuantity: createOrderDto.quantity,
      stopPrice: createOrderDto.stopPrice ?? null,
      timeInForce: createOrderDto.timeInForce ?? TimeInForce.GTC,
      clientOrderId: createOrderDto.clientOrderId ?? null,
      status: OrderStatus.PENDING,
    });

    const savedOrder: Order = await this.orderRepository.save(order);

    // Submit to matching engine via gRPC
    try {
      const response = await this.matchingService.submitOrder({
        id: savedOrder.id,
        user_id: userId,
        symbol: createOrderDto.symbol,
        side: createOrderDto.side,
        type: createOrderDto.type,
        price: createOrderDto.price?.toString() || '',
        quantity: createOrderDto.quantity.toString(),
        stop_price: createOrderDto.stopPrice?.toString() || '',
        time_in_force: createOrderDto.timeInForce,
        client_order_id: createOrderDto.clientOrderId,
      }).toPromise();

      // Update order with result from matching engine
      const { order: matchedOrder, trades } = response;
      
      savedOrder.status = matchedOrder.status;
      savedOrder.filledQuantity = matchedOrder.filled_quantity;
      savedOrder.remainingQuantity = matchedOrder.remaining_quantity;
      
      await this.orderRepository.save(savedOrder);

      // Save trades
      if (trades && trades.length > 0) {
        await this.saveTrades(trades, pairId);
      }

      this.logger.log(`Order created: ${savedOrder.id}, status: ${savedOrder.status}`);
    } catch (error) {
      this.logger.error('Failed to submit to matching engine via gRPC', error);
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
      await this.matchingService.cancelOrder({
        id: orderId,
        symbol: symbol,
      }).toPromise();
      
      // Unlock remaining balance
      // We need to calculate how much to unlock based on remaining quantity
      const remainingAmount = parseFloat(order.remainingQuantity.toString()) * (order.price ? parseFloat(order.price.toString()) : 0); // Logic mainly for LIMIT orders
      // For market orders, it's more complex as we locked estimated amount? 
      // Assuming LIMIT for now as createOrder enforces price for LIMIT.
      
      if (order.side === 'buy' && order.price) { // Only buy orders lock quote currency
          // Simplification: asset_id from symbol (e.g. BTC/USDT -> USDT)
          const assetId = symbol.split('/')[1]; 
          await this.walletService.unlockBalance({
              user_id: userId,
              asset_id: assetId,
              amount: remainingAmount.toString()
          }).toPromise();
      } else if (order.side === 'sell') {
           // Sell orders lock base currency
           const assetId = symbol.split('/')[0];
           await this.walletService.unlockBalance({
              user_id: userId,
              asset_id: assetId,
              amount: order.remainingQuantity.toString()
          }).toPromise();
      }

    } catch (error) {
      this.logger.error('Failed to cancel at matching engine via gRPC', error);
      // If matching engine fails, we don't cancel local order? Or we mark as failed?
      // Should probably re-throw
      throw error;
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
  async getOpenOrders(userId: string, _symbol?: string): Promise<Order[]> {
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
  private async getPairId(_symbol: string): Promise<string> {
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

      // Emit trade executed event to RabbitMQ
      this.rmqClient.emit(RABBITMQ.QUEUES.TRADE_EXECUTED, {
        tradeId: trade.id,
        pairId: pairId,
        symbol: trade.symbol, // Added symbol from matching engine response
        buyerId: trade.buyer_id || trade.buyerId,
        sellerId: trade.seller_id || trade.sellerId,
        price: trade.price,
        quantity: trade.quantity,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
