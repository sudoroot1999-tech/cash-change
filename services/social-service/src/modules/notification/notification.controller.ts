import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationDto } from '../../common/dto';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  getNotifications(@CurrentUser('userId') userId: string, @Query() pagination: PaginationDto, @Query('unreadOnly') unreadOnly?: boolean) {
    return this.notificationService.getUserNotifications(userId, pagination, unreadOnly);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@CurrentUser('userId') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id' })
  markAsRead(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.notificationService.markAsRead(id, userId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@CurrentUser('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id' })
  delete(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.notificationService.delete(id, userId);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all notifications' })
  deleteAll(@CurrentUser('userId') userId: string) {
    return this.notificationService.deleteAll(userId);
  }
}
