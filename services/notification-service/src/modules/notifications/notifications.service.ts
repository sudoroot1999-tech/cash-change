import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as Handlebars from 'handlebars';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
} from './entities/notification.entity';
import { SendNotificationDto, BulkNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue,
  ) {}

  /**
   * Send a notification
   */
  async send(dto: SendNotificationDto): Promise<Notification> {
    // Compile template if variables provided
    let content = dto.content;
    if (dto.variables) {
      const template = Handlebars.compile(dto.content);
      content = template(dto.variables);
    }

    // Create notification record
    const notification = this.notificationRepository.create({
      userId: dto.userId,
      channel: dto.channel,
      templateId: dto.templateId || null,
      subject: dto.subject || null,
      content,
      priority: dto.priority ?? NotificationPriority.MEDIUM,
      metadata: dto.metadata || {},
      status: NotificationStatus.PENDING,
    });

    const saved = await this.notificationRepository.save(notification);

    // Add to queue for processing
    await this.notificationQueue.add(
      'send',
      { notificationId: saved.id },
      { priority: dto.priority ?? NotificationPriority.MEDIUM },
    );

    this.logger.log(`Notification queued: ${saved.id} for user ${dto.userId}`);
    return saved;
  }

  /**
   * Send bulk notifications
   */
  async sendBulk(dto: BulkNotificationDto): Promise<{ queued: number }> {
    const notifications: Notification[] = [];

    for (const userId of dto.userIds) {
      let content = dto.content;
      if (dto.variables) {
        const template = Handlebars.compile(dto.content);
        content = template(dto.variables);
      }

      const notification = this.notificationRepository.create({
        userId,
        channel: dto.channel,
        templateId: dto.templateId || null,
        subject: dto.subject || null,
        content,
        priority: dto.priority ?? NotificationPriority.MEDIUM,
        status: NotificationStatus.PENDING,
      });
      notifications.push(notification);
    }

    const saved = await this.notificationRepository.save(notifications);

    // Queue all notifications
    const jobs = saved.map((n) => ({
      name: 'send',
      data: { notificationId: n.id },
      opts: { priority: dto.priority ?? NotificationPriority.MEDIUM },
    }));
    await this.notificationQueue.addBulk(jobs);

    this.logger.log(`Bulk notifications queued: ${saved.length}`);
    return { queued: saved.length };
  }

  /**
   * Send email directly without user ID (for verification codes)
   */
  async sendEmailDirect(dto: {
    email: string;
    subject: string;
    content: string;
    priority: NotificationPriority;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    // Add directly to queue for immediate processing
    await this.notificationQueue.add(
      'send_email_direct',
      {
        email: dto.email,
        subject: dto.subject,
        content: dto.content,
        metadata: dto.metadata,
      },
      { priority: dto.priority },
    );

    this.logger.log(`Direct email queued for: ${dto.email}`);
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    options: { channel?: NotificationChannel; unreadOnly?: boolean; page?: number; limit?: number },
  ): Promise<{ items: Notification[]; total: number }> {
    const { channel, unreadOnly, page = 1, limit = 20 } = options;

    const query = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .orderBy('n.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (channel) {
      query.andWhere('n.channel = :channel', { channel });
    }

    if (unreadOnly) {
      query.andWhere('n.read_at IS NULL');
    }

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<Notification | null> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (notification && !notification.readAt) {
      notification.readAt = new Date();
      return this.notificationRepository.save(notification);
    }

    return notification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .update()
      .set({ readAt: new Date() })
      .where('user_id = :userId AND read_at IS NULL', { userId })
      .execute();

    return { updated: result.affected || 0 };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, readAt: IsNull() },
    });
  }

  /**
   * Delete notification
   */
  async delete(userId: string, notificationId: string): Promise<boolean> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      userId,
    });
    return (result.affected || 0) > 0;
  }

  /**
   * Process notification (called by queue processor)
   */
  async processNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      this.logger.warn(`Notification not found: ${notificationId}`);
      return;
    }

    try {
      // Update status to queued
      notification.status = NotificationStatus.QUEUED;
      await this.notificationRepository.save(notification);

      // Send based on channel
      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmail(notification);
          break;
        case NotificationChannel.SMS:
          await this.sendSms(notification);
          break;
        case NotificationChannel.PUSH:
          await this.sendPush(notification);
          break;
        case NotificationChannel.IN_APP:
          // In-app notifications are already saved, just mark as sent
          break;
        case NotificationChannel.TELEGRAM:
          await this.sendTelegram(notification);
          break;
        default:
          this.logger.warn(`Unknown channel: ${notification.channel}`);
      }

      // Mark as sent
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await this.notificationRepository.save(notification);

      this.logger.log(`Notification sent: ${notificationId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send notification: ${notificationId}`, error);
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error.message;
      await this.notificationRepository.save(notification);
      throw error;
    }
  }

  // Channel-specific send methods (placeholders)
  private async sendEmail(notification: Notification): Promise<void> {
    // Would use nodemailer here
    this.logger.debug(`Sending email to user ${notification.userId}`);
  }

  private async sendSms(notification: Notification): Promise<void> {
    // Would use Twilio/AWS SNS here
    this.logger.debug(`Sending SMS to user ${notification.userId}`);
  }

  private async sendPush(notification: Notification): Promise<void> {
    // Would use Firebase/APNS here
    this.logger.debug(`Sending push to user ${notification.userId}`);
  }

  private async sendTelegram(notification: Notification): Promise<void> {
    // Would use Telegram Bot API here
    this.logger.debug(`Sending Telegram to user ${notification.userId}`);
  }

  /**
   * Process direct email (for verification codes)
   */
  async processDirectEmail(data: {
    email: string;
    subject: string;
    content: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    try {
      // Here you would integrate with your email service (nodemailer, SendGrid, etc.)
      // For now, we'll just log it
      this.logger.log(`Sending verification email to: ${data.email}`);
      this.logger.debug(`Subject: ${data.subject}`);
      this.logger.debug(`Content: ${data.content}`);
      
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.logger.log(`Verification email sent successfully to: ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${data.email}:`, error);
      throw error;
    }
  }
}
