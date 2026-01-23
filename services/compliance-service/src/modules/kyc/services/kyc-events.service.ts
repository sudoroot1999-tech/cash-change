import { Injectable, Logger } from '@nestjs/common';
import {
  RabbitMQService,
  KafkaService,
  EXCHANGES,
  ROUTING_KEYS,
  KAFKA_TOPICS,
  KycSubmittedEvent,
  KycUnderReviewEvent,
  KycApprovedEvent,
  KycRejectedEvent,
  KycDocumentRequestedEvent,
} from '@exchange/common';

@Injectable()
export class KycEventsService {
  private readonly logger = new Logger(KycEventsService.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly kafka: KafkaService,
  ) {}

  async publishKycSubmitted(userId: string, requestId: string, level: number): Promise<void> {
    try {
      const event: KycSubmittedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        kycRequestId: requestId,
        level,
        submittedAt: new Date(),
      };

      await this.rabbitmq.publish(EXCHANGES.KYC_EVENTS, ROUTING_KEYS.KYC_SUBMITTED, event);
      await this.kafka.produce(KAFKA_TOPICS.KYC_EVENTS, event, userId);
      this.logger.log(`Published KycSubmittedEvent for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to publish KycSubmittedEvent: ${(error as Error).message}`);
    }
  }

  async publishKycUnderReview(userId: string, requestId: string): Promise<void> {
    try {
      const event: KycUnderReviewEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        kycRequestId: requestId,
        reviewStartedAt: new Date(),
      };

      await this.kafka.produce(KAFKA_TOPICS.KYC_EVENTS, event, userId);
      this.logger.log(`Published KycUnderReviewEvent for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to publish KycUnderReviewEvent: ${(error as Error).message}`);
    }
  }

  async publishKycApproved(userId: string, requestId: string, level: number, reviewedBy: string): Promise<void> {
    try {
      const event: KycApprovedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        kycRequestId: requestId,
        level,
        reviewedBy,
        approvedAt: new Date(),
      };

      await this.rabbitmq.publish(EXCHANGES.KYC_EVENTS, ROUTING_KEYS.KYC_APPROVED, event);
      await this.kafka.produce(KAFKA_TOPICS.KYC_EVENTS, event, userId);
      this.logger.log(`Published KycApprovedEvent for user ${userId}, level ${level}`);
    } catch (error) {
      this.logger.error(`Failed to publish KycApprovedEvent: ${(error as Error).message}`);
    }
  }

  async publishKycRejected(userId: string, requestId: string, reason: string, reviewedBy: string): Promise<void> {
    try {
      const event: KycRejectedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        kycRequestId: requestId,
        reason,
        reviewedBy,
        rejectedAt: new Date(),
      };

      await this.rabbitmq.publish(EXCHANGES.KYC_EVENTS, ROUTING_KEYS.KYC_REJECTED, event);
      await this.kafka.produce(KAFKA_TOPICS.KYC_EVENTS, event, userId);
      this.logger.log(`Published KycRejectedEvent for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to publish KycRejectedEvent: ${(error as Error).message}`);
    }
  }

  async publishKycDocumentRequested(userId: string, requestId: string, documentType: string): Promise<void> {
    try {
      const event: KycDocumentRequestedEvent = {
        eventId: '',
        timestamp: new Date(),
        version: '1.0',
        userId,
        kycRequestId: requestId,
        documentType,
        requestedAt: new Date(),
      };

      await this.rabbitmq.publish(EXCHANGES.KYC_EVENTS, ROUTING_KEYS.KYC_DOCUMENT_REQUESTED, event);
      await this.kafka.produce(KAFKA_TOPICS.KYC_EVENTS, event, userId);
      this.logger.log(`Published KycDocumentRequestedEvent for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to publish KycDocumentRequestedEvent: ${(error as Error).message}`);
    }
  }
}
