import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process('send')
  async handleSend(job: Job<{ notificationId: string }>) {
    this.logger.debug(`Processing notification: ${job.data.notificationId}`);
    await this.notificationsService.processNotification(job.data.notificationId);
  }

  @Process('bulkSend')
  async handleBulkSend(job: Job<{ notificationIds: string[] }>) {
    this.logger.debug(`Processing bulk notifications: ${job.data.notificationIds.length}`);
    for (const id of job.data.notificationIds) {
      try {
        await this.notificationsService.processNotification(id);
      } catch (error) {
        this.logger.error(`Failed to process notification ${id}:`, error);
      }
    }
  }
}
