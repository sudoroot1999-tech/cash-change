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
  ) { }

  /**
   * Publish user registered event
   */
  async publishUserRegistered(registerEvent: UserRegisteredEvent): Promise<void> {
    try {

      // Publish to RabbitMQ for immediate processing (welcome email, etc.)
      await this.rabbitmq.publish<UserRegisteredEvent>(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.USER_REGISTERED,
        {
          ...registerEvent
        }
      );

      // Publish to Kafka for audit and analytics
      await this.kafka.produce<UserRegisteredEvent>(KAFKA_TOPICS.AUTH_EVENTS, registerEvent);

      this.logger.log(`Published UserRegisteredEvent for ${registerEvent.email}`);
    } catch (error) {
      this.logger.error(`Failed to publish UserRegisteredEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish user login event
   */
  async publishUserLogin(loginEvent: UserLoginEvent): Promise<void> {
    try {
      // Publish to Kafka for security analytics
      await this.kafka.produce<UserLoginEvent>(KAFKA_TOPICS.AUTH_EVENTS, loginEvent);
      this.logger.log(`Published UserLoginEvent for ${loginEvent.email}`);
    } catch (error) {
      this.logger.error(`Failed to publish UserLoginEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish user logout event
   */
  async publishUserLogout(logoutEvent: UserLogoutEvent
  ): Promise<void> {
    try {
      // Publish to Kafka for analytics
      await this.kafka.produce<UserLogoutEvent>(KAFKA_TOPICS.AUTH_EVENTS, logoutEvent);

      this.logger.log(`Published UserLogoutEvent for ${logoutEvent.email}`);
    } catch (error) {
      this.logger.error(`Failed to publish UserLogoutEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish password reset requested event
   */
  async publishPasswordResetRequested(event: PasswordResetRequestedEvent): Promise<void> {
    try {

      // Publish to RabbitMQ for email notification
      await this.rabbitmq.publish<PasswordResetRequestedEvent>(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.PASSWORD_RESET_REQUESTED,
        event,
      );

      // Publish to Kafka for security monitoring
      await this.kafka.produce(KAFKA_TOPICS.AUTH_EVENTS, event);

      this.logger.log(`Published PasswordResetRequestedEvent for ${event.email}`);
    } catch (error) {
      this.logger.error(`Failed to publish PasswordResetRequestedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish password changed event
   */
  async publishPasswordChanged(event: PasswordChangedEvent): Promise<void> {
    try {

      // Publish to RabbitMQ for security notification
      await this.rabbitmq.publish<PasswordChangedEvent>(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.PASSWORD_CHANGED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce<PasswordChangedEvent>(KAFKA_TOPICS.AUTH_EVENTS, event);

      this.logger.log(`Published PasswordChangedEvent for ${event.email}`);
    } catch (error) {
      this.logger.error(`Failed to publish PasswordChangedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish 2FA enabled event
   */
  async publishTwoFactorEnabled(event: TwoFactorEnabledEvent): Promise<void> {
    try {

      // Publish to RabbitMQ for confirmation email
      await this.rabbitmq.publish<TwoFactorEnabledEvent>(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.TWO_FACTOR_ENABLED,
        event,
      );

      // Publish to Kafka for analytics
      await this.kafka.produce<TwoFactorEnabledEvent>(KAFKA_TOPICS.AUTH_EVENTS, event);

      this.logger.log(`Published TwoFactorEnabledEvent for ${event.email}`);
    } catch (error) {
      this.logger.error(`Failed to publish TwoFactorEnabledEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish 2FA disabled event
   */
  async publishTwoFactorDisabled(event: TwoFactorDisabledEvent): Promise<void> {
    try {

      // Publish to RabbitMQ for security alert
      await this.rabbitmq.publish<TwoFactorDisabledEvent>(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.TWO_FACTOR_DISABLED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce<TwoFactorDisabledEvent>(KAFKA_TOPICS.AUTH_EVENTS, event);

      this.logger.log(`Published TwoFactorDisabledEvent for ${event.email}`);
    } catch (error) {
      this.logger.error(`Failed to publish TwoFactorDisabledEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish email verification requested event
   */
  async publishEmailVerificationRequested(event: EmailVerificationRequestedEvent): Promise<void> {
    try {

      // Publish to RabbitMQ for sending verification email
      await this.rabbitmq.publish<EmailVerificationRequestedEvent>(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.EMAIL_VERIFICATION_REQUESTED,
        event,
      );

      // Publish to Kafka for tracking
      await this.kafka.produce<EmailVerificationRequestedEvent>(KAFKA_TOPICS.AUTH_EVENTS, event);

      this.logger.log(`Published EmailVerificationRequestedEvent for ${event.email}`);
    } catch (error) {
      this.logger.error(`Failed to publish EmailVerificationRequestedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish email verified event
   */
  async publishEmailVerified(event: EmailVerifiedEvent): Promise<void> {
    try {

      // Publish to RabbitMQ for welcome actions
      await this.rabbitmq.publish<EmailVerifiedEvent>(
        EXCHANGES.AUTH_EVENTS,
        ROUTING_KEYS.EMAIL_VERIFIED,
        event,
      );

      // Publish to Kafka for analytics
      await this.kafka.produce<EmailVerifiedEvent>(KAFKA_TOPICS.AUTH_EVENTS, event);

      this.logger.log(`Published EmailVerifiedEvent for ${event.email}`);
    } catch (error) {
      this.logger.error(`Failed to publish EmailVerifiedEvent: ${(error as Error).message}`);
    }
  }
}
