import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { Lesson } from '../../database/entities/lesson.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';

@Resolver(() => Lesson)
export class LessonResolver {
  constructor(private readonly lessonService: LessonService) {}

  @Mutation(() => Lesson)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async createLesson(@Args('input') createLessonDto: CreateLessonDto): Promise<Lesson> {
    return this.lessonService.create(createLessonDto);
  }

  @Query(() => [Lesson], { name: 'lessonsByModule' })
  async findByModule(@Args('moduleId', { type: () => ID }) moduleId: string): Promise<Lesson[]> {
    return this.lessonService.findByModule(moduleId);
  }

  @Query(() => [Lesson], { name: 'lessonsByCourse' })
  async findByCourse(@Args('courseId', { type: () => ID }) courseId: string): Promise<Lesson[]> {
    return this.lessonService.findByCourse(courseId);
  }

  @Query(() => [Lesson], { name: 'previewLessons' })
  async getPreviewLessons(@Args('courseId', { type: () => ID }) courseId: string): Promise<Lesson[]> {
    return this.lessonService.getPreviewLessons(courseId);
  }

  @Query(() => Lesson, { name: 'lesson' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<Lesson> {
    return this.lessonService.findOne(id);
  }

  @Mutation(() => Lesson)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async updateLesson(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') updateLessonDto: UpdateLessonDto,
  ): Promise<Lesson> {
    return this.lessonService.update(id, updateLessonDto);
  }

  @Mutation(() => [Lesson])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async reorderLessons(
    @Args('moduleId', { type: () => ID }) moduleId: string,
    @Args('lessonIds', { type: () => [ID] }) lessonIds: string[],
  ): Promise<Lesson[]> {
    return this.lessonService.reorder(moduleId, lessonIds);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteLesson(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    await this.lessonService.remove(id);
    return true;
  }
}
