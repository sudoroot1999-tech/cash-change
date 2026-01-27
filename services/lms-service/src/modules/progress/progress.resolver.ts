import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { UserProgress, ProgressStatus } from '../../database/entities/user-progress.entity';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { CompleteLessonDto, AddNoteDto, AddBookmarkDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationMeta } from '../../common/dto/paginated-response.dto';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';

registerEnumType(ProgressStatus, { name: 'ProgressStatus' });

@ObjectType()
class PaginatedUserProgress {
  @Field(() => [UserProgress])
  items: UserProgress[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}

@Resolver(() => UserProgress)
@UseGuards(JwtAuthGuard)
export class ProgressResolver {
  constructor(private readonly progressService: ProgressService) {}

  @Mutation(() => UserProgress)
  async enrollCourse(
    @Args('input') enrollDto: EnrollCourseDto,
    @CurrentUser('userId') userId: string,
  ): Promise<UserProgress> {
    return this.progressService.enroll(userId, enrollDto);
  }

  @Query(() => PaginatedUserProgress, { name: 'myCourses' })
  async getMyCourses(
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
    @Args('status', { type: () => ProgressStatus, nullable: true }) status: ProgressStatus,
    @CurrentUser('userId') userId: string,
  ): Promise<PaginatedUserProgress> {
    return this.progressService.getUserCourses(userId, { page, limit }, status);
  }

  @Query(() => UserProgress, { name: 'courseProgress' })
  async getCourseProgress(
    @Args('courseId', { type: () => ID }) courseId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<UserProgress> {
    return this.progressService.getUserProgress(userId, courseId);
  }

  @Mutation(() => UserProgress)
  async completeLesson(
    @Args('courseId', { type: () => ID }) courseId: string,
    @Args('input') dto: CompleteLessonDto,
    @CurrentUser('userId') userId: string,
  ): Promise<UserProgress> {
    return this.progressService.completeLesson(userId, courseId, dto.lessonId, dto.timeSpent || 0);
  }

  @Mutation(() => UserProgress)
  async completeModule(
    @Args('courseId', { type: () => ID }) courseId: string,
    @Args('moduleId', { type: () => ID }) moduleId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<UserProgress> {
    return this.progressService.completeModule(userId, courseId, moduleId);
  }

  @Mutation(() => UserProgress)
  async completeCourse(
    @Args('courseId', { type: () => ID }) courseId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<UserProgress> {
    return this.progressService.completeCourse(userId, courseId);
  }

  @Mutation(() => UserProgress)
  async addNote(
    @Args('courseId', { type: () => ID }) courseId: string,
    @Args('input') dto: AddNoteDto,
    @CurrentUser('userId') userId: string,
  ): Promise<UserProgress> {
    return this.progressService.addNote(userId, courseId, dto.lessonId, dto.note);
  }

  @Mutation(() => UserProgress)
  async addBookmark(
    @Args('courseId', { type: () => ID }) courseId: string,
    @Args('input') dto: AddBookmarkDto,
    @CurrentUser('userId') userId: string,
  ): Promise<UserProgress> {
    return this.progressService.addBookmark(userId, courseId, dto.lessonId, dto.timestamp, dto.note);
  }

  @Mutation(() => UserProgress)
  async removeBookmark(
    @Args('courseId', { type: () => ID }) courseId: string,
    @Args('lessonId', { type: () => ID }) lessonId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<UserProgress> {
    return this.progressService.removeBookmark(userId, courseId, lessonId);
  }

  @Mutation(() => UserProgress)
  async dropCourse(
    @Args('courseId', { type: () => ID }) courseId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<UserProgress> {
    return this.progressService.dropCourse(userId, courseId);
  }
}
