import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import {NotificationCoreService as NotificationsService } from './notifications.service';
import { NotificationController } from './notifications.controller';
import { NotificationWorker } from './notifications.worker';
import { AuthEventsConsumer } from '../../consumers/auth-events.consumer';
import { NotificationHistory, NotificationQueue, PushToken } from './entities';
import { QueueService } from '@exchange/common';
import { EmailProvider, PushProvider, SmsProvider, TelegramProvider, WhatsAppProvider } from '../../providers';

import { TemplateService } from '../templates/templates.service';
import { PreferenceService } from '../preferences/preferences.service';
import { TemplatesModule } from '../templates/templates.module';
import { PreferencesModule } from '../preferences/preferences.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification,NotificationHistory,NotificationQueue,PushToken]),
    TemplatesModule,
    PreferencesModule
  ],
  controllers: [NotificationController],
  providers: [NotificationsService,NotificationWorker,AuthEventsConsumer,QueueService,EmailProvider,SmsProvider,PushProvider,TelegramProvider,WhatsAppProvider],
  exports: [NotificationsService],
})
export class NotificationsModule { }
