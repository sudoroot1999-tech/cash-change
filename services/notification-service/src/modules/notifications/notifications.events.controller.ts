import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RABBITMQ } from '@exchange/common';
import { NotificationsService } from './notifications.service';
import { NotificationChannel, NotificationPriority } from './entities/notification.entity';

@Controller()
export class NotificationsEventsController {
  private readonly logger = new Logger(NotificationsEventsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern(RABBITMQ.QUEUES.USER_CREATED)
  async handleUserCreated(@Payload() data: any): Promise<void> {
    this.logger.log(`Received user created event for: ${data.email}`);
    
    // Acknowledge message manually if needed, but usually auto-ack is default in NestJS RMQ unless noAck: false
    // const channel = context.getChannelRef();
    // const originalMsg = context.getMessage();
    
    try {
      await this.notificationsService.send({
        userId: data.id,
        channel: NotificationChannel.EMAIL,
        subject: 'Welcome to Exchange!',
        content: 'Welcome {{params.email}}, check out your profile!',
        variables: { email: data.email },
        priority: NotificationPriority.HIGH,
      });
      
      // channel.ack(originalMsg);
    } catch (error) {
      this.logger.error('Error handling user created event', error);
      // channel.nack(originalMsg);
    }
  }

  @EventPattern(RABBITMQ.QUEUES.KYC_UPDATED)
  async handleKycUpdated(@Payload() data: any): Promise<void> {
      this.logger.log(`Received KYC updated event for user: ${data.userId}`);
      
      const statusMessages: Record<string, string> = {
          'approved': 'Your KYC has been approved!',
          'rejected': 'Your KYC application was rejected.',
          'more_info_required': 'We need more information for your KYC.',
      };
      const statusMessage = statusMessages[data.status] || `Your KYC status is now ${data.status}`;

      await this.notificationsService.send({
          userId: data.userId,
          channel: NotificationChannel.EMAIL,
          subject: 'KYC Status Update',
          content: statusMessage,
          priority: NotificationPriority.HIGH,
      });
  }
}
