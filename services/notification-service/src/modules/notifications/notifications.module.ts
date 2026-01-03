import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import {NotificationCoreService as NotificationsService } from './notifications.service';
import { NotificationController } from './notifications.controller';
import { NotificationWorker } from './notifications.worker';
import { AuthEventsConsumer } from '../../consumers/auth-events.consumer';
import { NotificationHistory, NotificationQueue, PushToken } from './entities';
import { QueueService } from '@exchange/common';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification,NotificationHistory,NotificationQueue,PushToken]),
  ],
  controllers: [NotificationController],
  providers: [NotificationsService,NotificationWorker,AuthEventsConsumer,QueueService],
  exports: [NotificationsService],
})
export class NotificationsModule { }
