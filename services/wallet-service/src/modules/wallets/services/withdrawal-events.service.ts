import { Injectable, Logger } from '@nestjs/common';
import {
  RabbitMQService,
  KafkaService,
  EXCHANGES,
  ROUTING_KEYS,
  KAFKA_TOPICS,
  WithdrawalRequestedEvent,
  WithdrawalApprovedEvent,
  WithdrawalRejectedEvent,
  WithdrawalCompletedEvent,
  WithdrawalFailedEvent,
} from '@exchange/common';

/**
 * Service for publishing withdrawal-related events
 */
@Injectable()
export class WithdrawalEventsService {
  private readonly logger = new Logger(WithdrawalEventsService.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly kafka: KafkaService,
  ) {}

  /**
   * Publish withdrawal requested event
   */
  async publishWithdrawalRequested(
    withdrawalId: string,
    userId: string,
    asset: string,
    amount: string,
    fee: string,
    address: string,
    network: string,
    memo?: string,
  ): Promise<void> {
    try {
      const event: WithdrawalRequestedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        withdrawalId,
        userId,
        asset,
        amount,
        fee,
        address,
        network,
        memo,
      };

      // Publish to RabbitMQ for approval workflow
      await this.rabbitmq.publish(
        EXCHANGES.WALLET_EVENTS,
        ROUTING_KEYS.WITHDRAWAL_REQUESTED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce(KAFKA_TOPICS.WALLET_EVENTS, event, withdrawalId);

      this.logger.log(`Published WithdrawalRequestedEvent: ${withdrawalId}`);
    } catch (error) {
      this.logger.error(`Failed to publish WithdrawalRequestedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish withdrawal approved event
   */
  async publishWithdrawalApproved(
    withdrawalId: string,
    userId: string,
    asset: string,
    amount: string,
    address: string,
    network: string,
    approvedBy: string,
  ): Promise<void> {
    try {
      const event: WithdrawalApprovedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        withdrawalId,
        userId,
        asset,
        amount,
        address,
        network,
        approvedBy,
        approvedAt: new Date(),
      };

      // Publish to RabbitMQ for processing
      await this.rabbitmq.publish(
        EXCHANGES.WALLET_EVENTS,
        ROUTING_KEYS.WITHDRAWAL_APPROVED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce(KAFKA_TOPICS.WALLET_EVENTS, event, withdrawalId);

      this.logger.log(`Published WithdrawalApprovedEvent: ${withdrawalId}`);
    } catch (error) {
      this.logger.error(`Failed to publish WithdrawalApprovedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish withdrawal rejected event
   */
  async publishWithdrawalRejected(
    withdrawalId: string,
    userId: string,
    asset: string,
    amount: string,
    reason: string,
    rejectedBy: string,
  ): Promise<void> {
    try {
      const event: WithdrawalRejectedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        withdrawalId,
        userId,
        asset,
        amount,
        reason,
        rejectedBy,
      };

      // Publish to RabbitMQ for user notification
      await this.rabbitmq.publish(
        EXCHANGES.WALLET_EVENTS,
        ROUTING_KEYS.WITHDRAWAL_REJECTED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce(KAFKA_TOPICS.WALLET_EVENTS, event, withdrawalId);

      this.logger.log(`Published WithdrawalRejectedEvent: ${withdrawalId}`);
    } catch (error) {
      this.logger.error(`Failed to publish WithdrawalRejectedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish withdrawal completed event
   */
  async publishWithdrawalCompleted(
    withdrawalId: string,
    userId: string,
    asset: string,
    amount: string,
    txHash: string,
    network: string,
  ): Promise<void> {
    try {
      const event: WithdrawalCompletedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        withdrawalId,
        userId,
        asset,
        amount,
        txHash,
        network,
        completedAt: new Date(),
      };

      // Publish to RabbitMQ for user notification
      await this.rabbitmq.publish(
        EXCHANGES.WALLET_EVENTS,
        ROUTING_KEYS.WITHDRAWAL_COMPLETED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce(KAFKA_TOPICS.WALLET_EVENTS, event, withdrawalId);

      this.logger.log(`Published WithdrawalCompletedEvent: ${withdrawalId}`);
    } catch (error) {
      this.logger.error(`Failed to publish WithdrawalCompletedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish withdrawal failed event
   */
  async publishWithdrawalFailed(
    withdrawalId: string,
    userId: string,
    asset: string,
    amount: string,
    reason: string,
  ): Promise<void> {
    try {
      const event: WithdrawalFailedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        withdrawalId,
        userId,
        asset,
        amount,
        reason,
        failedAt: new Date(),
      };

      // Publish to RabbitMQ for handling
      await this.rabbitmq.publish(
        EXCHANGES.WALLET_EVENTS,
        ROUTING_KEYS.WITHDRAWAL_FAILED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce(KAFKA_TOPICS.WALLET_EVENTS, event, withdrawalId);

      this.logger.log(`Published WithdrawalFailedEvent: ${withdrawalId}`);
    } catch (error) {
      this.logger.error(`Failed to publish WithdrawalFailedEvent: ${(error as Error).message}`);
    }
  }
}
