import { Injectable, Logger } from '@nestjs/common';
import {
  RabbitMQService,
  KafkaService,
  EXCHANGES,
  ROUTING_KEYS,
  KAFKA_TOPICS,
  ProfileUpdatedEvent,
  AvatarUploadedEvent,
  PreferencesUpdatedEvent,
  UserDeletedEvent,
  UserSuspendedEvent,
  UserActivatedEvent,
} from '@exchange/common';

/**
 * Service for publishing user events
 */
@Injectable()
export class UserEventsService {
  private readonly logger = new Logger(UserEventsService.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly kafka: KafkaService,
  ) {}

  /**
   * Publish profile updated event
   */
  async publishProfileUpdated(
    userId: string,
    changes: Record<string, any>,
    updatedFields: string[],
  ): Promise<void> {
    try {
      const event: ProfileUpdatedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        changes,
        updatedFields,
      };

      // Publish to Kafka for analytics
      await this.kafka.produce(KAFKA_TOPICS.USER_EVENTS, event, userId);

      this.logger.log(`Published ProfileUpdatedEvent for ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to publish ProfileUpdatedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish avatar uploaded event
   */
  async publishAvatarUploaded(
    userId: string,
    avatarUrl: string,
    previousAvatarUrl?: string,
  ): Promise<void> {
    try {
      const event: AvatarUploadedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        avatarUrl,
        previousAvatarUrl,
      };

      // Publish to Kafka for analytics
      await this.kafka.produce(KAFKA_TOPICS.USER_EVENTS, event, userId);

      this.logger.log(`Published AvatarUploadedEvent for ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to publish AvatarUploadedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish preferences updated event
   */
  async publishPreferencesUpdated(
    userId: string,
    preferences: {
      language?: string;
      timezone?: string;
      currency?: string;
      notifications?: boolean;
    },
  ): Promise<void> {
    try {
      const event: PreferencesUpdatedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        preferences,
      };

      // Publish to RabbitMQ for immediate processing
      await this.rabbitmq.publish(
        EXCHANGES.USER_EVENTS,
        ROUTING_KEYS.PREFERENCES_UPDATED,
        event,
      );

      // Publish to Kafka for analytics
      await this.kafka.produce(KAFKA_TOPICS.USER_EVENTS, event, userId);

      this.logger.log(`Published PreferencesUpdatedEvent for ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to publish PreferencesUpdatedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish user deleted event
   */
  async publishUserDeleted(
    userId: string,
    reason: string | undefined,
    deletedBy: string,
  ): Promise<void> {
    try {
      const event: UserDeletedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        reason,
        deletedBy,
      };

      // Publish to RabbitMQ for cleanup tasks
      await this.rabbitmq.publish(
        EXCHANGES.USER_EVENTS,
        ROUTING_KEYS.USER_DELETED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce(KAFKA_TOPICS.USER_EVENTS, event, userId);

      this.logger.log(`Published UserDeletedEvent for ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to publish UserDeletedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish user suspended event
   */
  async publishUserSuspended(
    userId: string,
    reason: string,
    suspendedBy: string,
    suspendedUntil?: Date,
  ): Promise<void> {
    try {
      const event: UserSuspendedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        reason,
        suspendedBy,
        suspendedUntil,
      };

      // Publish to RabbitMQ for immediate actions (block access)
      await this.rabbitmq.publish(
        EXCHANGES.USER_EVENTS,
        ROUTING_KEYS.USER_SUSPENDED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce(KAFKA_TOPICS.USER_EVENTS, event, userId);

      this.logger.log(`Published UserSuspendedEvent for ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to publish UserSuspendedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish user activated event
   */
  async publishUserActivated(
    userId: string,
    activatedBy: string,
  ): Promise<void> {
    try {
      const event: UserActivatedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        activatedBy,
      };

      // Publish to RabbitMQ for immediate actions (restore access)
      await this.rabbitmq.publish(
        EXCHANGES.USER_EVENTS,
        ROUTING_KEYS.USER_ACTIVATED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce(KAFKA_TOPICS.USER_EVENTS, event, userId);

      this.logger.log(`Published UserActivatedEvent for ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to publish UserActivatedEvent: ${(error as Error).message}`);
    }
  }
}
