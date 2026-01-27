import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CourseReview } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationMeta } from '../../common/dto/paginated-response.dto';
import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
class PaginatedReviews {
  @Field(() => [CourseReview]) items: CourseReview[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@ObjectType()
class ReviewStats {
  @Field(() => Float) average: number;
  @Field(() => Int) count: number;
}

@Resolver(() => CourseReview)
export class ReviewResolver {
  constructor(private readonly reviewService: ReviewService) {}

  @Query(() => PaginatedReviews, { name: 'courseReviews' })
  async findByCourse(
    @Args('courseId', { type: () => ID }) courseId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
  ): Promise<PaginatedReviews> {
    return this.reviewService.findByCourse(courseId, { page, limit });
  }

  @Query(() => CourseReview, { name: 'review' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<CourseReview> {
    return this.reviewService.findOne(id);
  }

  @Query(() => CourseReview, { name: 'myReview', nullable: true })
  @UseGuards(JwtAuthGuard)
  async getMyReview(
    @Args('courseId', { type: () => ID }) courseId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<CourseReview | null> {
    return this.reviewService.getUserReview(userId, courseId);
  }

  @Query(() => ReviewStats, { name: 'courseReviewStats' })
  async getCourseStats(@Args('courseId', { type: () => ID }) courseId: string): Promise<ReviewStats> {
    return this.reviewService.getCourseStats(courseId);
  }

  @Mutation(() => CourseReview)
  @UseGuards(JwtAuthGuard)
  async markReviewHelpful(
    @Args('id', { type: () => ID }) id: string,
    @Args('helpful') helpful: boolean,
  ): Promise<CourseReview> {
    return this.reviewService.markHelpful(id, helpful);
  }

  @Mutation(() => CourseReview)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async addInstructorResponse(
    @Args('id', { type: () => ID }) id: string,
    @Args('comment') comment: string,
  ): Promise<CourseReview> {
    return this.reviewService.addInstructorResponse(id, comment);
  }
}
