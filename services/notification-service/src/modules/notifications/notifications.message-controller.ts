import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';
import { NotificationChannel, NotificationPriority } from './entities/notification.entity';

interface EmailNotificationPayload {
  email: string;
  channel: string;
  subject: string;
  content: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

@Controller()
export class NotificationsMessageController {
  private readonly logger = new Logger(NotificationsMessageController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern('send_notification')
  async handleSendNotification(@Payload() data: EmailNotificationPayload) {
    this.logger.log(`Received notification request for email: ${data.email}`);

    try {
      // For email verification codes, we don't need a userId in the database
      // We'll create a temporary notification record or send directly
      await this.notificationsService.sendEmailDirect({
        email: data.email,
        subject: data.subject,
        content: data.content,
        priority: data.priority || NotificationPriority.HIGH,
        metadata: data.metadata || {},
      });

      this.logger.log(`Email sent successfully to: ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${data.email}:`, error);
      throw error;
    }
  }
}