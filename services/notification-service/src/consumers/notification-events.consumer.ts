import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InAppNotificationEvent, NOTIFICATION_CHANNELS, NotificationChannel, NotificationType, QUEUES, RabbitMQService, SendEmailEvent, SendPushEvent, SendSmsEvent, NOTIFICATION_TYPES } from '@exchange/common';
import { NotificationCoreService } from '../modules/notifications/notifications.service';

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

@Injectable()
export class NotificationEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificationEventsConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly notificationService: NotificationCoreService,
  ) { }


  async onModuleInit() {
    // Email consumer
    await this.rabbitmq.subscribe<SendEmailEvent>(
      QUEUES.EMAIL_SEND,
      async (event) => {
        await this.handleEmailNotification(event)
      }
    );

    // SMS consumer
    await this.rabbitmq.subscribe<SendSmsEvent>(
      QUEUES.SMS_SEND,
      async (event) => {
        await this.handleSmsNotification(event)
      }
    );

    // Push consumer
    await this.rabbitmq.subscribe<SendPushEvent>(
      QUEUES.PUSH_SEND,
      async (event) => {
        this.handlePushNotification(event)
      },
    );

    // InApp consumer
    await this.rabbitmq.subscribe<InAppNotificationEvent>(
      QUEUES.IN_APP_NOTIFICATION,
      async (event) => {
        this.handleInAppNotification(event)
      },
    );

    // Telegram consumer
    await this.rabbitmq.subscribe(
      'notification.telegram.send',
      this.handleTelegramNotification.bind(this),
    );

    // WhatsApp consumer
    await this.rabbitmq.subscribe(
      'notification.whatsapp.send',
      this.handleWhatsAppNotification.bind(this),
    );

    this.logger.log('All notification consumers started');
  }

  private async handleEmailNotification(message: SendEmailEvent): Promise<void> {
    this.logger.log(`Processing email notification for user ${message.to}`);
    await this.processNotification({
      ...message,
      userId: message.to,
      channel: NOTIFICATION_CHANNELS.EMAIL,
      type: NOTIFICATION_TYPES.COMMON,
      templateId: message.template,
      content: ''
    }, NOTIFICATION_CHANNELS.EMAIL);
  }

  private async handleSmsNotification(message: SendSmsEvent): Promise<void> {
    this.logger.log(`Processing SMS notification for user ${message.to}`);
    await this.processNotification({
      ...message,
      userId: message.to,
      channel: NOTIFICATION_CHANNELS.SMS,
      type: NOTIFICATION_TYPES.COMMON,
      content: message.message
    }, NOTIFICATION_CHANNELS.SMS);
  }

  private async handlePushNotification(message: SendPushEvent): Promise<void> {
    this.logger.log(`Processing push notification for user ${message.userId}`);
    await this.processNotification({
      ...message,
      userId: message.userId,
      channel: NOTIFICATION_CHANNELS.PUSH,
      type: NOTIFICATION_TYPES.COMMON,
      content: message.body
    }, NOTIFICATION_CHANNELS.PUSH);
  }

  private async handleInAppNotification(message: InAppNotificationEvent): Promise<void> {
    this.logger.log(`Processing push notification for user ${message.userId}`);
    await this.processNotification({
      ...message,
      userId: message.userId,
      channel: NOTIFICATION_CHANNELS.IN_APP,
      type: NOTIFICATION_TYPES.COMMON,
      content: message.message
    }, NOTIFICATION_CHANNELS.IN_APP);
  }

  private async handleTelegramNotification(message: NotificationMessage): Promise<void> {
    this.logger.log(`Processing Telegram notification for user ${message.userId}`);
    await this.processNotification(message, NOTIFICATION_CHANNELS.TELEGRAM);
  }

  private async handleWhatsAppNotification(message: NotificationMessage): Promise<void> {
    this.logger.log(`Processing WhatsApp notification for user ${message.userId}`);
    await this.processNotification(message, NOTIFICATION_CHANNELS.WHATSAPP);
  }

  private async processNotification(
    message: NotificationMessage,
    channel: NotificationChannel,
  ): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        userId: message.userId,
        type: message.type as NotificationType,
        channels: [channel],
        templateId: message.templateId,
        subject: message.subject,
        content: message.content,
        data: message.data,
        metadata: message.metadata,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to process ${channel} notification for user ${message.userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
