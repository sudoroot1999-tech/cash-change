import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  RabbitMQService,
  QUEUES,
  OrderMatchedEvent,
  OrderFilledEvent,
  OrderCancelledEvent,
  TradeExecutedEvent,
} from '@exchange/common';
import { NotificationCoreService } from '../modules/notifications/notifications.service';
import { NotificationChannel, NotificationType } from '../modules/notifications/entities';


/**
 * Consumer for trading events
 * sendNotifications notifications to users about their orders and trades
 */
@Injectable()
export class TradingEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(TradingEventsConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly notificationService: NotificationCoreService,
  ) {}

  async onModuleInit() {
    // Subscribe to order matched events
    // await this.rabbitmq.subscribe<OrderMatchedEvent>(
    //   QUEUES.ORDER_MATCHED,
    //   async (event) => {
    //     await this.handleOrderMatched(event);
    //   },
    // );

    // Subscribe to order filled events
    // await this.rabbitmq.subscribe<OrderFilledEvent>(
    //   QUEUES.ORDER_FILLED,
    //   async (event) => {
    //     await this.handleOrderFilled(event);
    //   },
    // );

    // Subscribe to order cancelled events
    // await this.rabbitmq.subscribe<OrderCancelledEvent>(
    //   QUEUES.ORDER_CANCEL,
    //   async (event) => {
    //     await this.handleOrderCancelled(event);
    //   },
    // );

    // Subscribe to trade executed events
    // await this.rabbitmq.subscribe<TradeExecutedEvent>(
    //   QUEUES.TRADE_EXECUTE,
    //   async (event) => {
    //     await this.handleTradeExecuted(event);
    //   },
    // );

    this.logger.log('✅ Trading event consumers started');
  }

  /**
   * Handle order matched event
   */
  private async handleOrderMatched(event: OrderMatchedEvent): Promise<void> {
    try {
      this.logger.log(`Order matched: ${event.orderId} - ${event.status}`);

      // Determine notification type based on status
      if (event.status === 'partial') {
        await this.notificationService.sendNotification({
          userId: event.userId,
          type:NotificationType.INFO,
          channels:[NotificationChannel.EMAIL,NotificationChannel.IN_APP,NotificationChannel.PUSH],
          subject: 'Order Partially Filled',
          content: `Your ${event.pair} order has been partially filled.`,
          data: {
            orderId: event.orderId,
            pair: event.pair,
            filledQuantity: event.filledQuantity,
            remainingQuantity: event.remainingQuantity,
            averagePrice: event.averagePrice,
          },
        });
      } else if (event.status === 'filled') {
        await this.notificationService.sendNotification({
          userId: event.userId,
          type:NotificationType.INFO,
          channels:[NotificationChannel.EMAIL,NotificationChannel.IN_APP,NotificationChannel.PUSH],
          subject: 'Order Filled',
          content: `Your ${event.pair} order has been completely filled.`,
          data: {
            orderId: event.orderId,
            pair: event.pair,
            totalQuantity: event.filledQuantity,
            averagePrice: event.averagePrice,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error handling OrderMatchedEvent: ${(error as Error).message}`);
      // Don't throw - notification failure shouldn't block order processing
    }
  }

  /**
   * Handle order filled event
   */
  private async handleOrderFilled(event: OrderFilledEvent): Promise<void> {
    try {
      this.logger.log(`Order filled: ${event.orderId}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type:NotificationType.INFO,
        channels:[NotificationChannel.EMAIL,NotificationChannel.IN_APP,NotificationChannel.PUSH],
        subject: 'Order Completed Successfully',
        content: `Your ${event.pair} order for ${event.totalQuantity} has been completed at an average price of ${event.averagePrice}.`,
        data: {
          orderId: event.orderId,
          pair: event.pair,
          quantity: event.totalQuantity,
          averagePrice: event.averagePrice,
          totalCost: event.totalCost,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling OrderFilledEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle order cancelled event
   */
  private async handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    try {
      this.logger.log(`Order cancelled: ${event.orderId}`);

      await this.notificationService.sendNotification({
        userId: event.userId,
        type:NotificationType.INFO,
        channels: [NotificationChannel.PUSH], // Just push notification for cancellations
        subject: 'Order Cancelled',
        content: `Your ${event.pair} order has been cancelled.`,
        data: {
          orderId: event.orderId,
          pair: event.pair,
          reason: event.reason,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling OrderCancelledEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Handle trade executed event
   * Notify both buyer and seller
   */
  private async handleTradeExecuted(event: TradeExecutedEvent): Promise<void> {
    try {
      this.logger.log(`Trade executed: ${event.tradeId}`);

      // Notify buyer
      await this.notificationService.sendNotification({
        userId: event.buyUserId,
        type:NotificationType.INFO,
        channels:[NotificationChannel.EMAIL,NotificationChannel.IN_APP,NotificationChannel.PUSH],
        subject: 'Trade Executed',
        content: `You bought ${event.quantity} ${event.pair.split('/')[0]} at ${event.price}.`,
        data: {
          tradeId: event.tradeId,
          orderId: event.buyOrderId,
          pair: event.pair,
          side: 'buy',
          quantity: event.quantity,
          price: event.price,
          fee: event.buyerFee,
        },
      });

      // Notify seller
      await this.notificationService.sendNotification({
        userId: event.sellUserId,
        type: NotificationType.INFO,
        channels:[NotificationChannel.EMAIL,NotificationChannel.IN_APP,NotificationChannel.PUSH],
        subject: 'Trade Executed',
        content: `You sold ${event.quantity} ${event.pair.split('/')[0]} at ${event.price}.`,
        data: {
          tradeId: event.tradeId,
          orderId: event.sellOrderId,
          pair: event.pair,
          side: 'sell',
          quantity: event.quantity,
          price: event.price,
          fee: event.sellerFee,
        },
      });
    } catch (error) {
      this.logger.error(`Error handling TradeExecutedEvent: ${(error as Error).message}`);
    }
  }
}
