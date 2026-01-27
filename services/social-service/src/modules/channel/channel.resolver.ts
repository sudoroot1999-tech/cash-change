import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { Channel, ChannelPost, ChannelType, ChannelCategory, ChannelPostType, UserProfile } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationMeta } from '../../common/dto';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PaginatedChannels {
  @Field(() => [Channel]) items: Channel[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@ObjectType()
class PaginatedChannelPosts {
  @Field(() => [ChannelPost]) items: ChannelPost[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@Resolver(() => Channel)
export class ChannelResolver {
  constructor(private readonly channelService: ChannelService) {}

  @Query(() => Channel, { name: 'channel' })
  getChannel(@Args('id', { type: () => ID }) id: string, @CurrentUser('userId') userId?: string) {
    return this.channelService.findById(id, userId);
  }

  @Query(() => Channel, { name: 'channelByHandle' })
  getChannelByHandle(@Args('handle') handle: string, @CurrentUser('userId') userId?: string) {
    return this.channelService.findByHandle(handle, userId);
  }

  @Query(() => PaginatedChannels, { name: 'searchChannels' })
  searchChannels(
    @Args('query') query: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.channelService.searchChannels(query, { page, limit }, userId);
  }

  @Query(() => PaginatedChannels, { name: 'myChannels' })
  @UseGuards(JwtAuthGuard)
  getMyChannels(
    @CurrentUser('userId') userId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.channelService.getUserChannels(userId, { page, limit });
  }

  @Query(() => PaginatedChannelPosts, { name: 'channelPosts' })
  getChannelPosts(
    @Args('channelId', { type: () => ID }) channelId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.channelService.getChannelPosts(channelId, { page, limit });
  }

  @Mutation(() => Channel)
  @UseGuards(JwtAuthGuard)
  createChannel(
    @CurrentUser('userId') userId: string,
    @Args('name') name: string,
    @Args('handle') handle: string,
    @Args('description', { nullable: true }) description?: string,
    @Args('type', { type: () => ChannelType, nullable: true }) type?: ChannelType,
    @Args('category', { type: () => ChannelCategory, nullable: true }) category?: ChannelCategory,
  ) {
    return this.channelService.create(userId, { name, handle, description, type, category });
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  subscribeToChannel(@Args('channelId', { type: () => ID }) channelId: string, @CurrentUser('userId') userId: string) {
    return this.channelService.subscribe(channelId, userId).then(() => true);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  unsubscribeFromChannel(@Args('channelId', { type: () => ID }) channelId: string, @CurrentUser('userId') userId: string) {
    return this.channelService.unsubscribe(channelId, userId).then(() => true);
  }

  @Mutation(() => ChannelPost)
  @UseGuards(JwtAuthGuard)
  createChannelPost(
    @Args('channelId', { type: () => ID }) channelId: string,
    @CurrentUser('userId') userId: string,
    @Args('content', { nullable: true }) content?: string,
    @Args('type', { type: () => ChannelPostType, nullable: true }) type?: ChannelPostType,
  ) {
    return this.channelService.createPost(channelId, userId, { content, type });
  }
}
