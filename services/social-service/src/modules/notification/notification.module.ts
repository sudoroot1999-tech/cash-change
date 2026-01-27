import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../../database/entities';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationResolver } from './notification.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationResolver],
  exports: [NotificationService],
})
export class NotificationModule {}
