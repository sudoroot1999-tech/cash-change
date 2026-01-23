import { Injectable, Logger } from '@nestjs/common';
import {
  RabbitMQService,
  KafkaService,
  EXCHANGES,
  ROUTING_KEYS,
  KAFKA_TOPICS,
  DepositDetectedEvent,
  DepositConfirmedEvent,
  WalletCreatedEvent,
} from '@exchange/common';

/**
 * Service for publishing deposit-related events
 */
@Injectable()
export class DepositEventsService {
  private readonly logger = new Logger(DepositEventsService.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly kafka: KafkaService,
  ) {}

  /**
   * Publish deposit detected event
   */
  async publishDepositDetected(
    userId: string,
    asset: string,
    amount: string,
    txHash: string,
    confirmations: number,
    requiredConfirmations: number,
    network: string,
  ): Promise<void> {
    try {
      const event: DepositDetectedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        asset,
        amount,
        txHash,
        confirmations,
        requiredConfirmations,
        network,
      };

      // Publish to RabbitMQ for notifications
      await this.rabbitmq.publish(
        EXCHANGES.WALLET_EVENTS,
        ROUTING_KEYS.DEPOSIT_DETECTED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce(KAFKA_TOPICS.WALLET_EVENTS, event, userId);

      this.logger.log(`Published DepositDetectedEvent for ${userId}: ${amount} ${asset}`);
    } catch (error) {
      this.logger.error(`Failed to publish DepositDetectedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish deposit confirmed event
   */
  async publishDepositConfirmed(
    userId: string,
    asset: string,
    amount: string,
    txHash: string,
    confirmations: number,
    network: string,
  ): Promise<void> {
    try {
      const event: DepositConfirmedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        asset,
        amount,
        txHash,
        confirmations,
        network,
      };

      // Publish to RabbitMQ for immediate processing
      await this.rabbitmq.publish(
        EXCHANGES.WALLET_EVENTS,
        ROUTING_KEYS.DEPOSIT_CONFIRMED,
        event,
      );

      // Publish to Kafka for audit
      await this.kafka.produce(KAFKA_TOPICS.WALLET_EVENTS, event, userId);

      this.logger.log(`Published DepositConfirmedEvent for ${userId}: ${amount} ${asset}`);
    } catch (error) {
      this.logger.error(`Failed to publish DepositConfirmedEvent: ${(error as Error).message}`);
    }
  }

  /**
   * Publish wallet created event
   */
  async publishWalletCreated(
    userId: string,
    asset: string,
    address?: string,
    network?: string,
  ): Promise<void> {
    try {
      const event: WalletCreatedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        asset,
        address,
        network,
      };

      // Publish to Kafka for audit
      await this.kafka.produce(KAFKA_TOPICS.WALLET_EVENTS, event, userId);

      this.logger.log(`Published WalletCreatedEvent for ${userId}: ${asset}`);
    } catch (error) {
      this.logger.error(`Failed to publish WalletCreatedEvent: ${(error as Error).message}`);
    }
  }
}
