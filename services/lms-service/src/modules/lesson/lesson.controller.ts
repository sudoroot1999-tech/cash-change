import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonSwaggerDto } from './dto/update-lesson.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';

@ApiTags('lessons')
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new lesson' })
  @ApiResponse({ status: 201, description: 'Lesson created successfully' })
  async create(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonService.create(createLessonDto);
  }

  @Get('module/:moduleId')
  @ApiOperation({ summary: 'Get all lessons for a module' })
  @ApiParam({ name: 'moduleId', description: 'Module UUID' })
  @ApiResponse({ status: 200, description: 'List of lessons' })
  async findByModule(@Param('moduleId', ParseUUIDPipe) moduleId: string) {
    return this.lessonService.findByModule(moduleId);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get all lessons for a course' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'List of lessons' })
  async findByCourse(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.lessonService.findByCourse(courseId);
  }

  @Get('course/:courseId/preview')
  @ApiOperation({ summary: 'Get preview lessons for a course' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'List of preview lessons' })
  async getPreviewLessons(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.lessonService.getPreviewLessons(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lesson by ID' })
  @ApiParam({ name: 'id', description: 'Lesson UUID' })
  @ApiResponse({ status: 200, description: 'Lesson details' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a lesson' })
  @ApiParam({ name: 'id', description: 'Lesson UUID' })
  @ApiResponse({ status: 200, description: 'Lesson updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLessonDto: UpdateLessonSwaggerDto,
  ) {
    return this.lessonService.update(id, updateLessonDto);
  }

  @Put('module/:moduleId/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder lessons in a module' })
  @ApiParam({ name: 'moduleId', description: 'Module UUID' })
  @ApiResponse({ status: 200, description: 'Lessons reordered successfully' })
  async reorder(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() body: { lessonIds: string[] },
  ) {
    return this.lessonService.reorder(moduleId, body.lessonIds);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lesson' })
  @ApiParam({ name: 'id', description: 'Lesson UUID' })
  @ApiResponse({ status: 204, description: 'Lesson deleted successfully' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonService.remove(id);
  }
}
