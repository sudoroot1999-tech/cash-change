import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationCoreService } from './notifications.service';
import { SendNotificationDto, RegisterPushTokenDto } from './dto/notification.dto';
import { NOTIFICATION_TYPES, NotificationChannel, NotificationType, QUEUES, RabbitMQService, RequireAuth } from '@exchange/common';

@ApiTags('Notifications')
@Controller('notification')
@RequireAuth()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationCoreService,
    private readonly rabbitmq: RabbitMQService,
  ) { }

  @Post('send')
  @ApiOperation({ summary: 'Send a notification' })
  @ApiResponse({ status: 201, description: 'Notification queued successfully' })
  async sendNotification(@Body() dto: SendNotificationDto) {
    const queueIds = await this.notificationService.sendNotification({
      userId: dto.userId,
      type: dto.type,
      channels: dto.channels,
      templateId: dto.templateId,
      subject: dto.subject,
      content: dto.content,
      data: dto.data,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      metadata: dto.metadata,
    });

    return {
      success: true,
      queueIds,
      message: 'Notification(s) queued successfully',
    };
  }

  @Post('send-bulk')
  @ApiOperation({ summary: 'Send notifications to multiple users' })
  @ApiResponse({ status: 201, description: 'Notifications queued successfully' })
  async sendBulkNotification(
    @Body() dto: { userIds: string[]; notification: Omit<SendNotificationDto, 'userId'> },
  ) {
    const results = await Promise.all(
      dto.userIds.map(userId =>
        this.notificationService.sendNotification({
          userId,
          ...dto.notification,
          scheduledAt: dto.notification.scheduledAt ? new Date(dto.notification.scheduledAt) : undefined,
        }),
      ),
    );

    return {
      success: true,
      totalQueued: results.flat().length,
      message: 'Bulk notifications queued successfully',
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get notification history' })
  @ApiResponse({ status: 200, description: 'Notification history retrieved' })
  async getHistory(
    @Query('userId') userId: string,
    @Query('type') type?: NotificationType,
    @Query('channel') channel?: NotificationChannel,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const history = await this.notificationService.getHistory(userId, {
      type,
      channel,
      limit: limit || 50,
      offset: offset || 0,
    });

    return {
      success: true,
      data: history.items,
      total: history.total,
    };
  }

  @Post('mark-read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Body() body: { userId: string; notificationIds: string[] }) {
    await this.notificationService.markAsRead(body.userId, body.notificationIds);
    return {
      success: true,
      message: 'Notifications marked as read',
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Query('userId') userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);
    return {
      success: true,
      count,
    };
  }

  @Post('push-token/register')
  @ApiOperation({ summary: 'Register push notification token' })
  @ApiResponse({ status: 201, description: 'Token registered successfully' })
  async registerPushToken(
    @Query('userId') userId: string,
    @Body() dto: RegisterPushTokenDto,
  ) {
    const token = await this.notificationService.registerPushToken(userId, dto);
    return {
      success: true,
      data: token,
      message: 'Push token registered successfully',
    };
  }

  @Post('push-token/unregister')
  @ApiOperation({ summary: 'Unregister push notification token' })
  @HttpCode(HttpStatus.OK)
  async unregisterPushToken(@Body() body: { token: string }) {
    await this.notificationService.unregisterPushToken(body.token);
    return {
      success: true,
      message: 'Push token unregistered successfully',
    };
  }

  @Post('test')
  @ApiOperation({ summary: 'Send test notification' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async testNotification(
    @Body()
    body: {
      userId: string;
      channel: NotificationChannel;
      message: string;
    },
  ) {
    const queueIds = await this.notificationService.sendNotification({
      userId: body.userId,
      type: NOTIFICATION_TYPES.NEWS,
      channels: [body.channel],
      content: body.message,
      subject: 'Test Notification',
    });

    return {
      success: true,
      queueIds,
      message: 'Test notification sent',
    };
  }

  @Get('queue/stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  async getQueueStats() {
    const stats = await Promise.all([
      this.rabbitmq.getQueueStats(QUEUES.EMAIL_SEND),
      this.rabbitmq.getQueueStats(QUEUES.SMS_SEND),
      this.rabbitmq.getQueueStats(QUEUES.PUSH_SEND),
      this.rabbitmq.getQueueStats(QUEUES.TELEGRAM_SEND),
      this.rabbitmq.getQueueStats(QUEUES.WHATSAPP_SEND),
      this.rabbitmq.getQueueStats(QUEUES.IN_APP_NOTIFICATION),
    ]);

    return {
      success: true,
      data: {
        email: stats[0],
        sms: stats[1],
        push: stats[2],
        telegram: stats[3],
        whatsapp: stats[4],
        inapp: stats[5]
      },
    };
  }
}