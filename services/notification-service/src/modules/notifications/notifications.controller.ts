import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto, BulkNotificationDto } from './dto/notification.dto';
import { NotificationChannel } from './entities/notification.entity';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a notification' })
  async send(@Body() dto: SendNotificationDto) {
    return this.notificationsService.send(dto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send bulk notifications' })
  async sendBulk(@Body() dto: BulkNotificationDto) {
    return this.notificationsService.sendBulk(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'channel', enum: NotificationChannel, required: false })
  @ApiQuery({ name: 'unreadOnly', type: Boolean, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getNotifications(
    @Req() req: Request,
    @Query('channel') channel?: NotificationChannel,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = (req as any).user?.userId || 'test-user-id';
    const result = await this.notificationsService.getUserNotifications(userId, {
      channel,
      unreadOnly: unreadOnly === true,
      page: page || 1,
      limit: limit || 20,
    });
    return { data: result.items, meta: { total: result.total, page: page || 1, limit: limit || 20 } };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req: Request) {
    const userId = (req as any).user?.userId || 'test-user-id';
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId || 'test-user-id';
    return this.notificationsService.markAsRead(userId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: Request) {
    const userId = (req as any).user?.userId || 'test-user-id';
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const userId = (req as any).user?.userId || 'test-user-id';
    await this.notificationsService.delete(userId, id);
  }
}
