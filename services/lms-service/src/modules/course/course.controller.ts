import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseSwaggerDto } from './dto/update-course.dto';
import { CourseFilterDto } from './dto/course-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { Course } from '../../database/entities/course.entity';

@ApiTags('courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created successfully', type: Course })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Course already exists' })
  async create(@Body() createCourseDto: CreateCourseDto) {
    return this.courseService.create(createCourseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  async findAll(@Query() filterDto: CourseFilterDto) {
    return this.courseService.findAll(filterDto);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular courses' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of popular courses' })
  async getPopular(@Query('limit') limit?: number) {
    return this.courseService.getPopularCourses(limit || 10);
  }

  @Get('top-rated')
  @ApiOperation({ summary: 'Get top rated courses' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of top rated courses' })
  async getTopRated(@Query('limit') limit?: number) {
    return this.courseService.getTopRatedCourses(limit || 10);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get course by slug' })
  @ApiParam({ name: 'slug', description: 'Course slug' })
  @ApiResponse({ status: 200, description: 'Course details', type: Course })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.courseService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'Course details', type: Course })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.courseService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a course' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'Course updated successfully', type: Course })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCourseDto: UpdateCourseSwaggerDto,
  ) {
    return this.courseService.update(id, updateCourseDto);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a course' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'Course published successfully', type: Course })
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.courseService.publish(id);
  }

  @Patch(':id/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish a course' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'Course unpublished successfully', type: Course })
  async unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.courseService.unpublish(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a course' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  @ApiResponse({ status: 204, description: 'Course deleted successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.courseService.remove(id);
  }
}
