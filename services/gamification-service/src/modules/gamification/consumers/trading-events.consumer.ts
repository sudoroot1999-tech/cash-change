import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  RabbitMQService,
  QUEUES,
  TradeExecutedEvent,
  OrderFilledEvent,
} from '@exchange/common';
import { LevelService } from '../services/level.service';
import { MissionService } from '../services/mission.service';
import { BadgeService } from '../services/badge.service';

/**
 * Consumer for trading events to award gamification rewards
 */
@Injectable()
export class TradingEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(TradingEventsConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly levelService: LevelService,
    private readonly missionService: MissionService,
    private readonly badgeService: BadgeService,
  ) {}

  async onModuleInit() {
    // Subscribe to trade executed events
    await this.rabbitmq.subscribe<TradeExecutedEvent>(
      QUEUES.GAMIFICATION_TRADE_EXECUTED,
      async (event) => {
        await this.handleTradeExecuted(event);
      },
    );

    // Subscribe to order filled events
    await this.rabbitmq.subscribe<OrderFilledEvent>(
      QUEUES.GAMIFICATION_ORDER_FILLED,
      async (event) => {
        await this.handleOrderFilled(event);
      },
    );

    this.logger.log('✅ Trading event consumers started (Gamification)');
  }

  /**
   * Handle trade executed event - award XP to both users
   */
  private async handleTradeExecuted(event: TradeExecutedEvent): Promise<void> {
    try {
      this.logger.log(`Trade executed for gamification: ${event.tradeId}`);

      // Award XP to buyer
      await this.awardTradeXp(event.buyUserId, 'buy', event.quantity, event.price);

      // Award XP to seller
      await this.awardTradeXp(event.sellUserId, 'sell', event.quantity, event.price);

      // Update trading missions progress
      await this.missionService.updateMissionProgress(event.buyUserId, 'trade', 1);
      await this.missionService.updateMissionProgress(event.sellUserId, 'trade', 1);

      // Check for trading badges
      await this.badgeService.checkTradingBadges(event.buyUserId);
      await this.badgeService.checkTradingBadges(event.sellUserId);
    } catch (error) {
      this.logger.error(`Error handling TradeExecutedEvent: ${(error as Error).message}`);
      // Don't throw - gamification shouldn't block trading
    }
  }

  /**
   * Handle order filled event - award completion bonus
   */
  private async handleOrderFilled(event: OrderFilledEvent): Promise<void> {
    try {
      this.logger.log(`Order filled for gamification: ${event.orderId}`);

      // Award bonus XP for order completion
      const bonusXp = this.calculateOrderCompletionXp(event.totalQuantity, event.averagePrice);
      await this.levelService.addXp(
        event.userId,
        bonusXp,
        'ORDER_COMPLETED',
        event.orderId,
      );

      // Check for "First Trade" badge
      await this.badgeService.checkFirstTradeBadge(event.userId);
    } catch (error) {
      this.logger.error(`Error handling OrderFilledEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Award XP for trading activity
   */
  private async awardTradeXp(
    userId: string,
    side: 'buy' | 'sell',
    quantity: string,
    price: string,
  ): Promise<void> {
    // Calculate XP based on trade volume
    const tradeVolume = parseFloat(quantity) * parseFloat(price);
    let xp = 10; // Base XP for any trade

    // Bonus XP for larger trades
    if (tradeVolume > 1000) {
      xp += 20;
    } else if (tradeVolume > 100) {
      xp += 10;
    }

    await this.levelService.addXp(userId, xp, `TRADE_${side.toUpperCase()}`, undefined);
  }

  /**
   * Calculate bonus XP for order completion
   */
  private calculateOrderCompletionXp(quantity: string, price: string): number {
    const tradeValue = parseFloat(quantity) * parseFloat(price);

    if (tradeValue > 10000) {
      return 50;
    } else if (tradeValue > 1000) {
      return 30;
    } else if (tradeValue > 100) {
      return 15;
    }

    return 5;
  }
}
