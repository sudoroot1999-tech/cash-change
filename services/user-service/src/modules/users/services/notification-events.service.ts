import { Injectable, Logger } from "@nestjs/common";
import { EXCHANGES, InAppNotificationEvent, KafkaService, RabbitMQService, ROUTING_KEYS, SendEmailEvent, SendPushEvent, SendSmsEvent } from "@exchange/common";

export interface NotificationMessage {
    userId: string;
    type: string;
    channel: string;
    templateId?: string;
    subject?: string;
    content: string;
    data?: Record<string, any>;
    metadata?: Record<string, any>;
}


/**
 * Service for publishing notification events
 */
@Injectable()
export class NotificationEventsService {
    private readonly logger = new Logger(NotificationEventsService.name);

    constructor(
        private readonly rabbitmq: RabbitMQService,
        private readonly kafka: KafkaService,
    ) { }

    async publishEmailNotification(message: SendEmailEvent): Promise<void> {

        try {
            await this.rabbitmq.publish(
                EXCHANGES.NOTIFICATION_EVENTS,
                ROUTING_KEYS.EMAIL_SEND,
                message
            )

            await this.kafka.produce(
                EXCHANGES.NOTIFICATION_EVENTS,
                message,
                message.to
            )
            this.logger.error(`published EmailNotificationEvent for: ${message.to}`);
        }
        catch (error: any) {
            this.logger.error(`Failed to publish EmailNotificationEvent: ${(error as Error).message}`);
        }
    }

    async publishSmsNotification(message: SendSmsEvent): Promise<void> {

        try {
            await this.rabbitmq.publish(
                EXCHANGES.NOTIFICATION_EVENTS,
                ROUTING_KEYS.SMS_SEND,
                message
            )

            await this.kafka.produce(
                EXCHANGES.NOTIFICATION_EVENTS,
                message,
                message.to
            )
            this.logger.error(`published SMSNotificationEvent for: ${message.to}`);
        }
        catch (error: any) {
            this.logger.error(`Failed to publish SMSNotificationEvent: ${(error as Error).message}`);
        }
    }

    async publishPushNotification(message: SendPushEvent): Promise<void> {
        try {
            await this.rabbitmq.publish(
                EXCHANGES.NOTIFICATION_EVENTS,
                ROUTING_KEYS.PUSH_SEND,
                message
            )

            await this.kafka.produce(
                EXCHANGES.NOTIFICATION_EVENTS,
                message,
                message.userId
            )
            this.logger.error(`published PushNotificationEvent for: ${message.userId}`);
        }
        catch (error: any) {
            this.logger.error(`Failed to publish PushNotificationEvent: ${(error as Error).message}`);
        }
    }

    async publishTelegramNotification(message: NotificationMessage): Promise<void> {
        try {
            await this.rabbitmq.publish(
                EXCHANGES.NOTIFICATION_EVENTS,
                ROUTING_KEYS.TELEGRAM_SEND,
                message
            )

            await this.kafka.produce(
                EXCHANGES.NOTIFICATION_EVENTS,
                message,
                message.userId
            )
            this.logger.error(`published TelegramNotificationEvent for: ${message.userId}`);
        }
        catch (error: any) {
            this.logger.error(`Failed to publish TelegramNotificationEvent: ${(error as Error).message}`);
        }
    }

    async publishWhatsAppNotification(message: NotificationMessage): Promise<void> {
        try {
            await this.rabbitmq.publish(
                EXCHANGES.NOTIFICATION_EVENTS,
                ROUTING_KEYS.WHATSAPP_SEND,
                message
            )

            await this.kafka.produce(
                EXCHANGES.NOTIFICATION_EVENTS,
                message,
                message.userId
            )
            this.logger.error(`published WhatsappNotificationEvent for: ${message.userId}`);
        }
        catch (error: any) {
            this.logger.error(`Failed to publish WhatsappNotificationEvent: ${(error as Error).message}`);
        }
    }

    async publisInAppNotification(message: InAppNotificationEvent): Promise<void> {
        try {
            await this.rabbitmq.publish(
                EXCHANGES.NOTIFICATION_EVENTS,
                ROUTING_KEYS.IN_APP_NOTIFICATION,
                message
            )

            await this.kafka.produce(
                EXCHANGES.NOTIFICATION_EVENTS,
                message,
                message.userId
            )
            this.logger.error(`published InAppNotificationEvent for: ${message.userId}`);
        }
        catch (error: any) {
            this.logger.error(`Failed to publish InAppNotificationEvent: ${(error as Error).message}`);
        }
    }
}