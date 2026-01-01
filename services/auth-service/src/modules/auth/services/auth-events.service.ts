import { Injectable, Logger } from '@nestjs/common';
import {
  RabbitMQService,
  KafkaService,
  EXCHANGES,
  ROUTING_KEYS,
  KAFKA_TOPICS,
  UserRegisteredEvent,
  UserLoginEvent,
  UserLogoutEvent,
  PasswordResetRequestedEvent,
  PasswordChangedEvent,
  TwoFactorEnabledEvent,
  TwoFactorDisabledEvent,
  EmailVerificationRequestedEvent,
  EmailVerifiedEvent,
} from '@exchange/common';

/**
 * Service for publishing authentication events
 */
@Injectable()
export class AuthEventsService {
  private readonly logger = new Logger(AuthEventsService.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly kafka: KafkaService,
  ) {}

  /**
   * Publish user registered event
   */
  async publishUserRegistered(
    userId: string,
    email: string,
    username?: string,
  ): Promise<void> {
    try {
      const event: UserRegisteredEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        email,
        username,
        registeredAt: new Date(),
      };

      // Publish to RabbitMQ for immediate processing (welcome email, etc.)
      await this.rabbitmq.publish(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.USER_REGISTERED,
        event,
      );

      // Publish to Kafka for audit and analytics
      await this.kafka.produce(KAFKA_TOPICS.AUTH_EVENTS, event, userId);

      this.logger.log(`Published UserRegisteredEvent for ${email}`);
    } catch (error) {
      this.logger.error(`Failed to publish UserRegisteredEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish user login event
   */
  async publishUserLogin(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
    deviceId?: string,
  ): Promise<void> {
    try {
      const event: UserLoginEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        email,
        ipAddress,
        userAgent,
        deviceId,
        loginAt: new Date(),
      };

      // Publish to Kafka for security analytics
      await this.kafka.produce(KAFKA_TOPICS.AUTH_EVENTS, event, userId);

      this.logger.log(`Published UserLoginEvent for ${email}`);
    } catch (error) {
      this.logger.error(`Failed to publish UserLoginEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish user logout event
   */
  async publishUserLogout(
    userId: string,
    email: string,
    reason?: string,
  ): Promise<void> {
    try {
      const event: UserLogoutEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        email,
        reason,
        logoutAt: new Date(),
      };

      // Publish to Kafka for analytics
      await this.kafka.produce(KAFKA_TOPICS.AUTH_EVENTS, event, userId);

      this.logger.log(`Published UserLogoutEvent for ${email}`);
    } catch (error) {
      this.logger.error(`Failed to publish UserLogoutEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish password reset requested event
   */
  async publishPasswordResetRequested(
    userId: string,
    email: string,
    ipAddress: string,
  ): Promise<void> {
    try {
      const event: PasswordResetRequestedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        email,
        ipAddress,
        requestedAt: new Date(),
      };

      // Publish to RabbitMQ for email notification
      await this.rabbitmq.publish(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.PASSWORD_RESET_REQUESTED,
        event,
      );

      // Publish to Kafka for security monitoring
      await this.kafka.produce(KAFKA_TOPICS.AUTH_EVENTS, event, userId);

      this.logger.log(`Published PasswordResetRequestedEvent for ${email}`);
    } catch (error) {
      this.logger.error(`Failed to publish PasswordResetRequestedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish password changed event
   */
  async publishPasswordChanged(
    userId: string,
    email: string,
    changedBy: 'user' | 'admin' | 'reset',
  ): Promise<void> {
    try {
      const event: PasswordChangedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        email,
        changedBy,
        changedAt: new Date(),
      };

      // Publish to RabbitMQ for security notification
      await this.rabbitmq.publish(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.PASSWORD_CHANGED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce(KAFKA_TOPICS.AUTH_EVENTS, event, userId);

      this.logger.log(`Published PasswordChangedEvent for ${email}`);
    } catch (error) {
      this.logger.error(`Failed to publish PasswordChangedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish 2FA enabled event
   */
  async publishTwoFactorEnabled(
    userId: string,
    email: string,
    method: 'totp' | 'sms' | 'email',
  ): Promise<void> {
    try {
      const event: TwoFactorEnabledEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        email,
        method,
        enabledAt: new Date(),
      };

      // Publish to RabbitMQ for confirmation email
      await this.rabbitmq.publish(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.TWO_FACTOR_ENABLED,
        event,
      );

      // Publish to Kafka for analytics
      await this.kafka.produce(KAFKA_TOPICS.AUTH_EVENTS, event, userId);

      this.logger.log(`Published TwoFactorEnabledEvent for ${email}`);
    } catch (error) {
      this.logger.error(`Failed to publish TwoFactorEnabledEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish 2FA disabled event
   */
  async publishTwoFactorDisabled(
    userId: string,
    email: string,
  ): Promise<void> {
    try {
      const event: TwoFactorDisabledEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        email,
        disabledAt: new Date(),
      };

      // Publish to RabbitMQ for security alert
      await this.rabbitmq.publish(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.TWO_FACTOR_DISABLED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce(KAFKA_TOPICS.AUTH_EVENTS, event, userId);

      this.logger.log(`Published TwoFactorDisabledEvent for ${email}`);
    } catch (error) {
      this.logger.error(`Failed to publish TwoFactorDisabledEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish email verification requested event
   */
  async publishEmailVerificationRequested(
    userId: string,
    email: string,
  ): Promise<void> {
    try {
      const event: EmailVerificationRequestedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        email,
        requestedAt: new Date(),
      };

      // Publish to RabbitMQ for sending verification email
      await this.rabbitmq.publish(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.EMAIL_VERIFICATION_REQUESTED,
        event,
      );

      // Publish to Kafka for tracking
      await this.kafka.produce(KAFKA_TOPICS.AUTH_EVENTS, event, userId);

      this.logger.log(`Published EmailVerificationRequestedEvent for ${email}`);
    } catch (error) {
      this.logger.error(`Failed to publish EmailVerificationRequestedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish email verified event
   */
  async publishEmailVerified(
    userId: string,
    email: string,
  ): Promise<void> {
    try {
      const event: EmailVerifiedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        email,
        verifiedAt: new Date(),
      };

      // Publish to RabbitMQ for welcome actions
      await this.rabbitmq.publish(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.EMAIL_VERIFIED,
        event,
      );

      // Publish to Kafka for analytics
      await this.kafka.produce(KAFKA_TOPICS.AUTH_EVENTS, event, userId);

      this.logger.log(`Published EmailVerifiedEvent for ${email}`);
    } catch (error) {
      this.logger.error(`Failed to publish EmailVerifiedEvent: ${(error as Error).message}`);
    }
  }
}
