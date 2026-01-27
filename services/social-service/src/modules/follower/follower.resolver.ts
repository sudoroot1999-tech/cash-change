import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FollowerService } from './follower.service';
import { Follower, UserProfile, FollowStatus } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationMeta } from '../../common/dto';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PaginatedUsers {
  @Field(() => [UserProfile]) items: UserProfile[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@Resolver(() => Follower)
export class FollowerResolver {
  constructor(private readonly followerService: FollowerService) {}

  @Query(() => PaginatedUsers, { name: 'followers' })
  getFollowers(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.followerService.getFollowers(userId, { page, limit });
  }

  @Query(() => PaginatedUsers, { name: 'following' })
  getFollowing(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.followerService.getFollowing(userId, { page, limit });
  }

  @Query(() => PaginatedUsers, { name: 'pendingFollowRequests' })
  @UseGuards(JwtAuthGuard)
  getPendingRequests(
    @CurrentUser('userId') userId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.followerService.getPendingRequests(userId, { page, limit });
  }

  @Query(() => FollowStatus, { name: 'followStatus', nullable: true })
  @UseGuards(JwtAuthGuard)
  getFollowStatus(
    @CurrentUser('userId') followerId: string,
    @Args('userId', { type: () => ID }) followingId: string,
  ) {
    return this.followerService.getFollowStatus(followerId, followingId);
  }

  @Mutation(() => Follower)
  @UseGuards(JwtAuthGuard)
  followUser(
    @CurrentUser('userId') followerId: string,
    @Args('userId', { type: () => ID }) followingId: string,
  ) {
    return this.followerService.follow(followerId, followingId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  unfollowUser(
    @CurrentUser('userId') followerId: string,
    @Args('userId', { type: () => ID }) followingId: string,
  ) {
    return this.followerService.unfollow(followerId, followingId).then(() => true);
  }

  @Mutation(() => Follower)
  @UseGuards(JwtAuthGuard)
  acceptFollowRequest(
    @CurrentUser('userId') userId: string,
    @Args('followerId', { type: () => ID }) followerId: string,
  ) {
    return this.followerService.acceptFollowRequest(userId, followerId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  rejectFollowRequest(
    @CurrentUser('userId') userId: string,
    @Args('followerId', { type: () => ID }) followerId: string,
  ) {
    return this.followerService.rejectFollowRequest(userId, followerId).then(() => true);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  blockUser(
    @CurrentUser('userId') userId: string,
    @Args('blockedUserId', { type: () => ID }) blockedUserId: string,
  ) {
    return this.followerService.blockUser(userId, blockedUserId).then(() => true);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  unblockUser(
    @CurrentUser('userId') userId: string,
    @Args('blockedUserId', { type: () => ID }) blockedUserId: string,
  ) {
    return this.followerService.unblockUser(userId, blockedUserId).then(() => true);
  }
}
