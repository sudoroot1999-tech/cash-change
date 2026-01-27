import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CourseService } from './course.service';
import { Course } from '../../database/entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseFilterDto } from './dto/course-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { PaginatedResponse, PaginationMeta } from '../../common/dto/paginated-response.dto';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PaginatedCourses {
  @Field(() => [Course])
  items: Course[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}

@Resolver(() => Course)
export class CourseResolver {
  constructor(private readonly courseService: CourseService) {}

  @Mutation(() => Course)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async createCourse(@Args('input') createCourseDto: CreateCourseDto): Promise<Course> {
    return this.courseService.create(createCourseDto);
  }

  @Query(() => PaginatedCourses, { name: 'courses' })
  async findAll(@Args() filterDto: CourseFilterDto): Promise<PaginatedCourses> {
    return this.courseService.findAll(filterDto);
  }

  @Query(() => Course, { name: 'course' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<Course> {
    return this.courseService.findOne(id);
  }

  @Query(() => Course, { name: 'courseBySlug' })
  async findBySlug(@Args('slug') slug: string): Promise<Course> {
    return this.courseService.findBySlug(slug);
  }

  @Query(() => [Course], { name: 'popularCourses' })
  async getPopular(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
  ): Promise<Course[]> {
    return this.courseService.getPopularCourses(limit);
  }

  @Query(() => [Course], { name: 'topRatedCourses' })
  async getTopRated(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
  ): Promise<Course[]> {
    return this.courseService.getTopRatedCourses(limit);
  }

  @Mutation(() => Course)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async updateCourse(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') updateCourseDto: UpdateCourseDto,
  ): Promise<Course> {
    return this.courseService.update(id, updateCourseDto);
  }

  @Mutation(() => Course)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async publishCourse(@Args('id', { type: () => ID }) id: string): Promise<Course> {
    return this.courseService.publish(id);
  }

  @Mutation(() => Course)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  async unpublishCourse(@Args('id', { type: () => ID }) id: string): Promise<Course> {
    return this.courseService.unpublish(id);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteCourse(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    await this.courseService.remove(id);
    return true;
  }
}
