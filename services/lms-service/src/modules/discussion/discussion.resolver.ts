import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DiscussionService } from './discussion.service';
import { Discussion, DiscussionType } from '../../entities';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationMeta } from '../../dto/paginated-response.dto';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PaginatedDiscussions {
  @Field(() => [Discussion]) items: Discussion[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@Resolver(() => Discussion)
export class DiscussionResolver {
  constructor(private readonly discussionService: DiscussionService) {}

  @Query(() => PaginatedDiscussions, { name: 'discussionsByLesson' })
  async findByLesson(
    @Args('lessonId', { type: () => ID }) lessonId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
  ): Promise<PaginatedDiscussions> {
    return this.discussionService.findByLesson(lessonId, { page, limit });
  }

  @Query(() => Discussion, { name: 'discussion' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<Discussion> {
    return this.discussionService.findOne(id);
  }

  @Mutation(() => Discussion)
  @UseGuards(JwtAuthGuard)
  async addReply(
    @Args('discussionId', { type: () => ID }) discussionId: string,
    @Args('content') content: string,
    @CurrentUser() user: any,
  ): Promise<Discussion> {
    return this.discussionService.addReply(discussionId, user.userId, user.email, content);
  }

  @Mutation(() => Discussion)
  @UseGuards(JwtAuthGuard)
  async markAsSolution(
    @Args('discussionId', { type: () => ID }) discussionId: string,
    @Args('replyId') replyId: string,
  ): Promise<Discussion> {
    return this.discussionService.markAsSolution(discussionId, replyId);
  }

  @Mutation(() => Discussion)
  @UseGuards(JwtAuthGuard)
  async likeDiscussion(@Args('id', { type: () => ID }) id: string): Promise<Discussion> {
    return this.discussionService.like(id);
  }
}
