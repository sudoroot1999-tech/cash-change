import { Injectable } from "@nestjs/common";
import { QueueNames, QueueService } from "@exchange/common";
import { NotificationCoreService } from "./notifications.service";

@Injectable()
export class NotificationWorker {
  constructor(
    private readonly queueService: QueueService,
    private readonly notificationService: NotificationCoreService,
  ) {}

  onModuleInit() {
    this.queueService.createWorker(
      QueueNames.NOTIFICATION,
      async (job) => {
        const { notificationId } = job.data;
        await this.notificationService.processNotificationById(notificationId);
      },
      {
        concurrency: 10,
      },
    );
  }
}
