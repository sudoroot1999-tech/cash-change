import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notification, NotificationType } from '../../database/entities';
import { PaginationDto, createPaginationMeta } from '../../common/dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(data: { userId: string; type: NotificationType; title: string; message?: string; actorId?: string; targetId?: string; targetType?: string; actionUrl?: string; imageUrl?: string; metadata?: any }): Promise<Notification> {
    const notification = this.notificationRepo.create(data);
    const saved = await this.notificationRepo.save(notification);
    this.eventEmitter.emit('notification.created', saved);
    return saved;
  }

  async getUserNotifications(userId: string, pagination: PaginationDto, unreadOnly: boolean = false) {
    const { page = 1, limit = 20 } = pagination;
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total] = await this.notificationRepo.findAndCount({
      where,
      relations: ['actor'],
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'DESC' },
    });

    return { items: notifications, meta: createPaginationMeta(page, limit, total) };
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found');

    notification.isRead = true;
    notification.readAt = new Date();
    return this.notificationRepo.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.update({ userId, isRead: false }, { isRead: true, readAt: new Date() });
  }

  async delete(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    await this.notificationRepo.remove(notification);
  }

  async deleteAll(userId: string): Promise<void> {
    await this.notificationRepo.delete({ userId });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({ where: { userId, isRead: false } });
  }

  // Helper methods for creating specific notification types
  async notifyFollow(followerId: string, followingId: string, followerName: string): Promise<void> {
    await this.create({
      userId: followingId,
      type: NotificationType.FOLLOW,
      title: 'New Follower',
      message: `${followerName} started following you`,
      actorId: followerId,
      actionUrl: `/profile/${followerId}`,
    });
  }

  async notifyLike(actorId: string, targetUserId: string, actorName: string, postId: string): Promise<void> {
    await this.create({
      userId: targetUserId,
      type: NotificationType.LIKE,
      title: 'New Like',
      message: `${actorName} liked your post`,
      actorId,
      targetId: postId,
      targetType: 'post',
      actionUrl: `/post/${postId}`,
    });
  }

  async notifyComment(actorId: string, targetUserId: string, actorName: string, postId: string): Promise<void> {
    await this.create({
      userId: targetUserId,
      type: NotificationType.COMMENT,
      title: 'New Comment',
      message: `${actorName} commented on your post`,
      actorId,
      targetId: postId,
      targetType: 'post',
      actionUrl: `/post/${postId}`,
    });
  }

  async notifyMention(actorId: string, targetUserId: string, actorName: string, targetId: string, targetType: string): Promise<void> {
    await this.create({
      userId: targetUserId,
      type: NotificationType.MENTION,
      title: 'You were mentioned',
      message: `${actorName} mentioned you`,
      actorId,
      targetId,
      targetType,
      actionUrl: `/${targetType}/${targetId}`,
    });
  }

  async notifyCopyTrade(traderId: string, copierId: string, copierName: string): Promise<void> {
    await this.create({
      userId: traderId,
      type: NotificationType.COPY_TRADE,
      title: 'New Copier',
      message: `${copierName} started copying your trades`,
      actorId: copierId,
      actionUrl: `/copy-trading/copiers`,
    });
  }
}
