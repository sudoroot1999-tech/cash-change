import { Resolver, Query, Mutation, Args, ID, Int, Subscription } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { NotificationService } from './notification.service';
import { Notification } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationMeta } from '../../common/dto';
import { ObjectType, Field } from '@nestjs/graphql';

const pubSub = new PubSub();

@ObjectType()
class PaginatedNotifications {
  @Field(() => [Notification]) items: Notification[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@Resolver(() => Notification)
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  @Query(() => PaginatedNotifications, { name: 'notifications' })
  @UseGuards(JwtAuthGuard)
  getNotifications(
    @CurrentUser('userId') userId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
    @Args('unreadOnly', { nullable: true, defaultValue: false }) unreadOnly: boolean,
  ) {
    return this.notificationService.getUserNotifications(userId, { page, limit }, unreadOnly);
  }

  @Query(() => Int, { name: 'unreadNotificationCount' })
  @UseGuards(JwtAuthGuard)
  getUnreadCount(@CurrentUser('userId') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Mutation(() => Notification)
  @UseGuards(JwtAuthGuard)
  markNotificationAsRead(@Args('id', { type: () => ID }) id: string, @CurrentUser('userId') userId: string) {
    return this.notificationService.markAsRead(id, userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  markAllNotificationsAsRead(@CurrentUser('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId).then(() => true);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  deleteNotification(@Args('id', { type: () => ID }) id: string, @CurrentUser('userId') userId: string) {
    return this.notificationService.delete(id, userId).then(() => true);
  }

  @Subscription(() => Notification, {
    name: 'newNotification',
    filter: (payload, variables) => payload.newNotification.userId === variables.userId,
  })
  subscribeToNotifications(@Args('userId', { type: () => ID }) userId: string) {
    return pubSub.asyncIterator('newNotification');
  }
}
