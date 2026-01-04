import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import {
  NotificationQueue,
  NotificationHistory,
  NotificationStatus,
  DeliveryStatus,
  NotificationChannel,
  NotificationType,
  PushToken,
} from './entities';
import { EmailProvider, SmsProvider, PushProvider, TelegramProvider, WhatsAppProvider } from '../../providers';
import { TemplateService } from '../templates/templates.service';
import {  PreferenceService } from '../preferences/preferences.service';
import { QueueNames, QueueService } from '@exchange/common';

export interface SendNotificationOptions {
  userId: string;
  type: NotificationType;
  channels?: NotificationChannel[];
  templateId?: string;
  subject?: string;
  content: string;
  data?: Record<string, any>;
  scheduledAt?: Date;
  metadata?: Record<string, any>;
  priority?: number;
}

@Injectable()
export class NotificationCoreService {
  private readonly logger = new Logger(NotificationCoreService.name);

  constructor(
    @InjectRepository(NotificationQueue)
    private queueRepository: Repository<NotificationQueue>,
    @InjectRepository(NotificationHistory)
    private historyRepository: Repository<NotificationHistory>,
    @InjectRepository(PushToken)
    private pushTokenRepository: Repository<PushToken>,
    private queueService:QueueService,
    private emailProvider: EmailProvider,
    private smsProvider: SmsProvider,
    private pushProvider: PushProvider,
    private telegramProvider: TelegramProvider,
    private whatsappProvider: WhatsAppProvider,
    private templateService: TemplateService,
    private preferenceService: PreferenceService,
  ) {}

  async sendNotification(options: SendNotificationOptions): Promise<string[]> {
    const queueIds: string[] = [];

    // Get user's enabled channels
    let channels = options.channels;
    if (!channels || channels.length === 0) {
      channels = await this.preferenceService.getEnabledChannels(options.userId, options.type);
    }

    if (channels.length === 0) {
      this.logger.warn(`No enabled channels for user ${options.userId} and type ${options.type}`);
      return queueIds;
    }

    // Prepare content for each channel
    let content = options.content;
    let subject = options.subject;

    if (options.templateId) {
      for (const channel of channels) {
        const rendered = await this.templateService.renderTemplate(
          options.templateId,
          options.data || {},
          this.getChannelType(channel),
        );
        content = rendered.content;
        subject = rendered.subject || subject;

        const queueItem = await this.addToQueue({
          ...options,
          channel,
          content,
          subject,
        });
        queueIds.push(queueItem.id);
      }
    } else {
      for (const channel of channels) {
        const queueItem = await this.addToQueue({
          ...options,
          channel,
          content,
          subject,
        });
        queueIds.push(queueItem.id);
      }
    }

    return queueIds;
  }

  private getChannelType(channel: NotificationChannel): 'email' | 'sms' | 'push' {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return 'email';
      case NotificationChannel.SMS:
      case NotificationChannel.TELEGRAM:
      case NotificationChannel.WHATSAPP:
        return 'sms';
      case NotificationChannel.PUSH:
      case NotificationChannel.IN_APP:
        return 'push';
      default:
        return 'email';
    }
  }

  private async addToQueue(
    options: SendNotificationOptions & { channel: NotificationChannel },
  ): Promise<NotificationQueue> {
    const queueItem = this.queueRepository.create({
      userId: options.userId,
      type: options.type,
      channel: options.channel,
      templateId: options.templateId,
      subject: options.subject,
      content: options.content,
      data: options.data,
      scheduledAt: options.scheduledAt || new Date(),
      metadata: options.metadata,
      priority: options.priority || 5,
      status: NotificationStatus.PENDING,
    });

    const saved = await this.queueRepository.save(queueItem);

    await this.queueService.addJob(
      QueueNames.NOTIFICATION,
      'send',
      { notificationId: saved.id },
      {
        priority: saved.priority,
        attempts: saved.maxRetries,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    this.logger.log(`Notification queued: ${saved.id} for user ${options.userId} via ${options.channel}`);
    return saved;
  }

  async processQueue(): Promise<void> {
    const pendingNotifications = await this.queueRepository.find({
      where: {
        status: NotificationStatus.PENDING,
        scheduledAt: LessThanOrEqual(new Date()),
      },
      order: {
        priority: 'DESC',
        createdAt: 'ASC',
      },
      take: 100,
    });

    this.logger.log(`Processing ${pendingNotifications.length} pending notifications`);

    for (const notification of pendingNotifications) {
      await this.processNotification(notification);
    }
  }

  async processNotification(notification: NotificationQueue): Promise<void> {
    try {
      // Update status to processing
      notification.status = NotificationStatus.PROCESSING;
      await this.queueRepository.save(notification);

      // Get user preferences for recipient info
      const preferences = await this.preferenceService.getUserPreferencesByType(
        notification.userId,
        notification.type,
      );

      let result: { success: boolean; messageId?: string; error?: string };

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          result = await this.sendEmail(notification, preferences?.email);
          break;
        case NotificationChannel.SMS:
          result = await this.sendSms(notification, preferences?.phoneNumber);
          break;
        case NotificationChannel.PUSH:
          result = await this.sendPush(notification);
          break;
        case NotificationChannel.TELEGRAM:
          result = await this.sendTelegram(notification, preferences?.telegramChatId);
          break;
        case NotificationChannel.WHATSAPP:
          result = await this.sendWhatsApp(notification, preferences?.whatsappNumber);
          break;
        case NotificationChannel.IN_APP:
          result = await this.saveInApp(notification);
          break;
        default:
          throw new Error(`Unknown channel: ${notification.channel}`);
      }

      if (result.success) {
        notification.status = NotificationStatus.SENT;
        notification.sentAt = new Date();
        await this.queueRepository.save(notification);

        // Save to history
        await this.saveToHistory(notification, DeliveryStatus.SENT, result.messageId);
      } else {
        await this.handleFailure(notification, result.error);
      }
    } catch (error:any) {
      this.logger.error(`Failed to process notification ${notification.id}: ${error.message}`, error.stack);
      await this.handleFailure(notification, error.message);
    }
  }

  async processNotificationById(id: string) {
    const notification = await this.queueRepository.findOneBy({ id });
    if (!notification) return;
    return this.processNotification(notification);
  }

  private async sendEmail(
    notification: NotificationQueue,
    email?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!email) {
      return { success: false, error: 'Email address not configured' };
    }

    return this.emailProvider.send({
      to: email,
      subject: notification.subject || 'Notification',
      html: notification.content,
      text: notification.content.replace(/<[^>]*>/g, ''),
    });
  }

  private async sendSms(
    notification: NotificationQueue,
    phoneNumber?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!phoneNumber) {
      return { success: false, error: 'Phone number not configured' };
    }

    return this.smsProvider.send({
      to: phoneNumber,
      message: notification.content,
    });
  }

  private async sendPush(
    notification: NotificationQueue,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const tokens = await this.pushTokenRepository.find({
      where: { userId: notification.userId, isActive: true },
    });

    if (tokens.length === 0) {
      return { success: false, error: 'No push tokens found' };
    }

    const results = await Promise.all(
      tokens.map(token =>
        this.pushProvider.send({
          token: token.token,
          title: notification.subject || 'Notification',
          body: notification.content,
          data: notification.data,
          platform: token.platform,
        }),
      ),
    );

    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount > 0,
      messageId: results.find(r => r.messageId)?.messageId,
      error: successCount === 0 ? 'All push notifications failed' : undefined,
    };
  }

  private async sendTelegram(
    notification: NotificationQueue,
    chatId?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!chatId) {
      return { success: false, error: 'Telegram chat ID not configured' };
    }

    const result = await this.telegramProvider.send({
      chatId,
      message: notification.content,
      parseMode: 'HTML',
    });

    return {
      success: result.success,
      messageId: result.messageId?.toString(),
      error: result.error,
    };
  }

  private async sendWhatsApp(
    notification: NotificationQueue,
    whatsappNumber?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!whatsappNumber) {
      return { success: false, error: 'WhatsApp number not configured' };
    }

    return this.whatsappProvider.send({
      to: whatsappNumber,
      message: notification.content,
    });
  }

  private async saveInApp(
    notification: NotificationQueue,
  ): Promise<{ success: boolean; messageId?: string }> {
    // In-app notifications are saved directly to history
    return { success: true, messageId: notification.id };
  }

  private async handleFailure(notification: NotificationQueue, errorMessage: string): Promise<void> {
    notification.retryCount += 1;
    notification.errorMessage = errorMessage;

    if (notification.retryCount >= notification.maxRetries) {
      notification.status = NotificationStatus.FAILED;
      await this.saveToHistory(notification, DeliveryStatus.FAILED);
      this.logger.error(`Notification ${notification.id} failed after ${notification.retryCount} attempts`);
    } else {
      notification.status = NotificationStatus.PENDING;
      this.logger.warn(
        `Notification ${notification.id} failed, will retry (${notification.retryCount}/${notification.maxRetries})`,
      );
    }

    await this.queueRepository.save(notification);
  }

  private async saveToHistory(
    notification: NotificationQueue,
    status: DeliveryStatus,
    externalId?: string,
  ): Promise<void> {
    const history = this.historyRepository.create({
      userId: notification.userId,
      type: notification.type,
      channel: notification.channel,
      templateId: notification.templateId,
      queueId: notification.id,
      subject: notification.subject,
      content: notification.content,
      status,
      externalId,
      metadata: notification.metadata,
      sentAt: notification.sentAt,
      isRead: notification.channel === NotificationChannel.IN_APP ? false : undefined,
    });

    await this.historyRepository.save(history);
  }

  async getHistory(
    userId: string,
    options?: {
      type?: NotificationType;
      channel?: NotificationChannel;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ items: NotificationHistory[]; total: number }> {
    const where: any = { userId };
    if (options?.type) where.type = options.type;
    if (options?.channel) where.channel = options.channel;

    const [items, total] = await this.historyRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return { items, total };
  }

  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    await this.historyRepository.update(
      {
        userId,
        id: In(notificationIds),
      },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.historyRepository.count({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        isRead: false,
      },
    });
  }

  async registerPushToken(
    userId: string,
    tokenData: Partial<PushToken>,
  ): Promise<PushToken> {
    // Check if token already exists
    const existing = await this.pushTokenRepository.findOne({
      where: { token: tokenData.token },
    });

    if (existing) {
      existing.userId = userId;
      existing.isActive = true;
      existing.lastUsedAt = new Date();
      Object.assign(existing, tokenData);
      return this.pushTokenRepository.save(existing);
    }

    const token = this.pushTokenRepository.create({
      userId,
      ...tokenData,
      isActive: true,
      lastUsedAt: new Date(),
    });

    return this.pushTokenRepository.save(token);
  }

  async unregisterPushToken(token: string): Promise<void> {
    await this.pushTokenRepository.update(
      { token },
      { isActive: false },
    );
  }
}
