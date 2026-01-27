import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { StoryService } from './story.service';
import { Story, StoryType } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { ObjectType, Field } from '@nestjs/graphql';
import { UserProfile } from '../../database/entities';

@ObjectType()
class StoryGroup {
  @Field() userId: string;
  @Field(() => UserProfile, { nullable: true }) user?: UserProfile;
  @Field(() => [Story]) stories: Story[];
}

@Resolver(() => Story)
export class StoryResolver {
  constructor(private readonly storyService: StoryService) {}

  @Query(() => [StoryGroup], { name: 'storiesFeed' })
  @UseGuards(JwtAuthGuard)
  getFeed(@CurrentUser('userId') userId: string) {
    return this.storyService.getFeedStories(userId);
  }

  @Query(() => [Story], { name: 'userStories' })
  getUserStories(
    @Args('userId', { type: () => ID }) userId: string,
    @CurrentUser('userId') viewerId?: string,
  ) {
    return this.storyService.getUserStories(userId, viewerId);
  }

  @Query(() => Story, { name: 'story' })
  getStory(@Args('id', { type: () => ID }) id: string, @CurrentUser('userId') userId?: string) {
    return this.storyService.findById(id, userId);
  }

  @Mutation(() => Story)
  @UseGuards(JwtAuthGuard)
  createStory(
    @CurrentUser('userId') userId: string,
    @Args('type', { type: () => StoryType }) type: StoryType,
    @Args('mediaUrl', { nullable: true }) mediaUrl?: string,
    @Args('content', { nullable: true }) content?: string,
    @Args('backgroundColor', { nullable: true }) backgroundColor?: string,
    @Args('linkUrl', { nullable: true }) linkUrl?: string,
  ) {
    return this.storyService.create(userId, type, { mediaUrl, content, backgroundColor, linkUrl });
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  deleteStory(@Args('id', { type: () => ID }) id: string, @CurrentUser('userId') userId: string) {
    return this.storyService.delete(id, userId).then(() => true);
  }

  @Mutation(() => Story)
  @UseGuards(JwtAuthGuard)
  likeStory(@Args('id', { type: () => ID }) id: string, @CurrentUser('userId') userId: string) {
    return this.storyService.like(id, userId);
  }
}
