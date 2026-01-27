import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CommentService } from './comment.service';
import { Comment } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationMeta } from '../../common/dto';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PaginatedComments {
  @Field(() => [Comment]) items: Comment[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@Resolver(() => Comment)
export class CommentResolver {
  constructor(private readonly commentService: CommentService) {}

  @Query(() => PaginatedComments, { name: 'postComments' })
  getPostComments(
    @Args('postId', { type: () => ID }) postId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.commentService.getPostComments(postId, { page, limit }, userId);
  }

  @Mutation(() => Comment)
  @UseGuards(JwtAuthGuard)
  createComment(
    @CurrentUser('userId') userId: string,
    @Args('postId', { type: () => ID }) postId: string,
    @Args('content') content: string,
    @Args('parentId', { type: () => ID, nullable: true }) parentId?: string,
  ) {
    return this.commentService.create(postId, userId, content, parentId);
  }

  @Mutation(() => Comment)
  @UseGuards(JwtAuthGuard)
  updateComment(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser('userId') userId: string,
    @Args('content') content: string,
  ) {
    return this.commentService.update(id, userId, content);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  deleteComment(@Args('id', { type: () => ID }) id: string, @CurrentUser('userId') userId: string) {
    return this.commentService.delete(id, userId).then(() => true);
  }

  @Mutation(() => Comment)
  @UseGuards(JwtAuthGuard)
  likeComment(@Args('id', { type: () => ID }) id: string, @CurrentUser('userId') userId: string) {
    return this.commentService.like(id, userId);
  }
}
