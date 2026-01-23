import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationCoreService as NotificationsService } from './notifications.service';
import { NotificationController } from './notifications.controller';
import { NotificationWorker } from './notifications.worker';
import { AuthEventsConsumer } from '../../consumers/auth-events.consumer';
import { NotificationHistory, NotificationQueue, PushToken } from './entities';
import { EmailProvider, PushProvider, SmsProvider, TelegramProvider, WhatsAppProvider } from '../../providers';
import { TemplatesModule } from '../templates/templates.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { NotificationEventsConsumer } from '../../consumers/notification-events.consumer';
import { TradingEventsConsumer } from '../../consumers/trading-events.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationHistory, NotificationQueue, PushToken]),
    TemplatesModule,
    PreferencesModule
  ],
  controllers: [NotificationController],
  providers: [
    NotificationsService,
    NotificationWorker,
    AuthEventsConsumer,
    NotificationEventsConsumer,
    EmailProvider,
    SmsProvider,
    PushProvider,
    TelegramProvider,
    WhatsAppProvider
  ],
  exports: [NotificationsService],
})
export class NotificationsModule { }
