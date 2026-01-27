import { Injectable, Logger } from '@nestjs/common';
import {
  RabbitMQService,
  KafkaService,
  EXCHANGES,
  ROUTING_KEYS,
  KAFKA_TOPICS,
  XpEarnedEvent,
  LevelUpEvent,
  BadgeEarnedEvent,
  MissionCompletedEvent,
  AchievementUnlockedEvent,
} from '@exchange/common';

/**
 * Service for publishing gamification events
 */
@Injectable()
export class GamificationEventsService {
  private readonly logger = new Logger(GamificationEventsService.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly kafka: KafkaService,
  ) {}

  /**
   * Publish XP earned event
   */
  async publishXpEarned(
    userId: string,
    amount: number,
    reason: string,
    referenceId?: string,
  ): Promise<void> {
    try {
      const event: XpEarnedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        amount,
        reason,
        referenceId,
        earnedAt: new Date(),
      };

      // Publish to RabbitMQ for immediate processing
      await this.rabbitmq.publish(
        EXCHANGES.GAMIFICATION_EVENTS,
        ROUTING_KEYS.XP_EARNED,
        event,
      );

      // Publish to Kafka for analytics
      await this.kafka.produce(KAFKA_TOPICS.GAMIFICATION_EVENTS, event, userId);

      this.logger.log(`Published XpEarnedEvent for ${userId}: +${amount} XP`);
    } catch (error) {
      this.logger.error(`Failed to publish XpEarnedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish level up event
   */
  async publishLevelUp(
    userId: string,
    previousLevel: number,
    newLevel: number,
    rewards?: Record<string, any>,
  ): Promise<void> {
    try {
      const event: LevelUpEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        previousLevel,
        newLevel,
        rewards,
        leveledUpAt: new Date(),
      };

      // Publish to RabbitMQ for notifications
      await this.rabbitmq.publish(
        EXCHANGES.GAMIFICATION_EVENTS,
        ROUTING_KEYS.LEVEL_UP,
        event,
      );

      // Publish to Kafka for analytics
      await this.kafka.produce(KAFKA_TOPICS.GAMIFICATION_EVENTS, event, userId);

      this.logger.log(`Published LevelUpEvent for ${userId}: Level ${newLevel}`);
    } catch (error) {
      this.logger.error(`Failed to publish LevelUpEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish badge earned event
   */
  async publishBadgeEarned(
    userId: string,
    badgeId: string,
    badgeName: string,
    badgeType: string,
  ): Promise<void> {
    try {
      const event: BadgeEarnedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        badgeId,
        badgeName,
        badgeType,
        earnedAt: new Date(),
      };

      // Publish to RabbitMQ for notifications
      await this.rabbitmq.publish(
        EXCHANGES.GAMIFICATION_EVENTS,
        ROUTING_KEYS.BADGE_EARNED,
        event,
      );

      // Publish to Kafka for analytics
      await this.kafka.produce(KAFKA_TOPICS.GAMIFICATION_EVENTS, event, userId);

      this.logger.log(`Published BadgeEarnedEvent for ${userId}: ${badgeName}`);
    } catch (error) {
      this.logger.error(`Failed to publish BadgeEarnedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish mission completed event
   */
  async publishMissionCompleted(
    userId: string,
    missionId: string,
    missionName: string,
    xpReward: number,
    rewards?: Record<string, any>,
  ): Promise<void> {
    try {
      const event: MissionCompletedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        missionId,
        missionName,
        xpReward,
        rewards,
        completedAt: new Date(),
      };

      // Publish to RabbitMQ for rewards processing
      await this.rabbitmq.publish(
        EXCHANGES.GAMIFICATION_EVENTS,
        ROUTING_KEYS.MISSION_COMPLETED,
        event,
      );

      // Publish to Kafka for analytics
      await this.kafka.produce(KAFKA_TOPICS.GAMIFICATION_EVENTS, event, userId);

      this.logger.log(`Published MissionCompletedEvent for ${userId}: ${missionName}`);
    } catch (error) {
      this.logger.error(`Failed to publish MissionCompletedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish achievement unlocked event
   */
  async publishAchievementUnlocked(
    userId: string,
    achievementId: string,
    achievementName: string,
    achievementType: string,
    xpReward: number,
  ): Promise<void> {
    try {
      const event: AchievementUnlockedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        achievementId,
        achievementName,
        achievementType,
        xpReward,
        unlockedAt: new Date(),
      };

      // Publish to RabbitMQ for notifications
      await this.rabbitmq.publish(
        EXCHANGES.GAMIFICATION_EVENTS,
        ROUTING_KEYS.ACHIEVEMENT_UNLOCKED,
        event,
      );

      // Publish to Kafka for analytics
      await this.kafka.produce(KAFKA_TOPICS.GAMIFICATION_EVENTS, event, userId);

      this.logger.log(`Published AchievementUnlockedEvent for ${userId}: ${achievementName}`);
    } catch (error) {
      this.logger.error(`Failed to publish AchievementUnlockedEvent: ${(error as Error).message}`);
    }
  }
}
