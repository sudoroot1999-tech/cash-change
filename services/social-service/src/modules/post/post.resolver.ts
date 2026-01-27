import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PostService } from './post.service';
import { Post } from '../../database/entities';
import { CreatePostDto, UpdatePostDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationMeta } from '../../common/dto';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  items: Post[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}

@Resolver(() => Post)
export class PostResolver {
  constructor(private readonly postService: PostService) {}

  @Query(() => Post, { name: 'post' })
  getPost(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.postService.findById(id, userId);
  }

  @Query(() => PaginatedPosts, { name: 'feed' })
  @UseGuards(JwtAuthGuard)
  getFeed(
    @CurrentUser('userId') userId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.postService.getFeed(userId, { page, limit });
  }

  @Query(() => PaginatedPosts, { name: 'exploreFeed' })
  getExploreFeed(
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.postService.getExploreFeed({ page, limit }, userId);
  }

  @Query(() => PaginatedPosts, { name: 'userPosts' })
  getUserPosts(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
    @CurrentUser('userId') currentUserId?: string,
  ) {
    return this.postService.getUserPosts(userId, { page, limit }, currentUserId);
  }

  @Query(() => PaginatedPosts, { name: 'bookmarks' })
  @UseGuards(JwtAuthGuard)
  getBookmarks(
    @CurrentUser('userId') userId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.postService.getBookmarks(userId, { page, limit });
  }

  @Mutation(() => Post)
  @UseGuards(JwtAuthGuard)
  createPost(
    @CurrentUser('userId') userId: string,
    @Args('input') input: CreatePostDto,
  ) {
    return this.postService.create(userId, input);
  }

  @Mutation(() => Post)
  @UseGuards(JwtAuthGuard)
  updatePost(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
    @Args('input') input: UpdatePostDto,
  ) {
    return this.postService.update(id, userId, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  deletePost(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.postService.delete(id, userId).then(() => true);
  }

  @Mutation(() => Post)
  @UseGuards(JwtAuthGuard)
  likePost(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.postService.like(id, userId);
  }

  @Mutation(() => Post)
  @UseGuards(JwtAuthGuard)
  bookmarkPost(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
    @Args('collection', { nullable: true }) collection?: string,
  ) {
    return this.postService.bookmark(id, userId, collection);
  }

  @Mutation(() => Post)
  @UseGuards(JwtAuthGuard)
  sharePost(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
    @Args('content', { nullable: true }) content?: string,
  ) {
    return this.postService.share(id, userId, content);
  }

  @Mutation(() => Post)
  @UseGuards(JwtAuthGuard)
  pinPost(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.postService.pin(id, userId);
  }
}
