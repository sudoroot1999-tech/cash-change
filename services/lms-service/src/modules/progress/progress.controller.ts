import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { CompleteLessonDto, AddNoteDto, AddBookmarkDto } from './dto/update-progress.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProgressStatus } from '../../database/entities/user-progress.entity';

@ApiTags('progress')
@Controller('progress')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('enroll')
  @ApiOperation({ summary: 'Enroll in a course' })
  @ApiResponse({ status: 201, description: 'Enrolled successfully' })
  @ApiResponse({ status: 409, description: 'Already enrolled' })
  async enroll(@Body() enrollDto: EnrollCourseDto, @CurrentUser('userId') userId: string) {
    return this.progressService.enroll(userId, enrollDto);
  }

  @Get('my-courses')
  @ApiOperation({ summary: 'Get user enrolled courses' })
  @ApiQuery({ name: 'status', required: false, enum: ProgressStatus })
  @ApiResponse({ status: 200, description: 'List of enrolled courses' })
  async getMyCourses(
    @Query() paginationDto: PaginationDto,
    @Query('status') status: ProgressStatus,
    @CurrentUser('userId') userId: string,
  ) {
    return this.progressService.getUserCourses(userId, paginationDto, status);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get progress for a specific course' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'Course progress' })
  async getCourseProgress(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.progressService.getUserProgress(userId, courseId);
  }

  @Post('course/:courseId/complete-lesson')
  @ApiOperation({ summary: 'Mark a lesson as completed' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'Lesson completed' })
  async completeLesson(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CompleteLessonDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.progressService.completeLesson(userId, courseId, dto.lessonId, dto.timeSpent || 0);
  }

  @Post('course/:courseId/complete-module/:moduleId')
  @ApiOperation({ summary: 'Mark a module as completed' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiParam({ name: 'moduleId', description: 'Module UUID' })
  @ApiResponse({ status: 200, description: 'Module completed' })
  async completeModule(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.progressService.completeModule(userId, courseId, moduleId);
  }

  @Post('course/:courseId/complete')
  @ApiOperation({ summary: 'Mark course as completed' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'Course completed' })
  async completeCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.progressService.completeCourse(userId, courseId);
  }

  @Post('course/:courseId/notes')
  @ApiOperation({ summary: 'Add a note to a lesson' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'Note added' })
  async addNote(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: AddNoteDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.progressService.addNote(userId, courseId, dto.lessonId, dto.note);
  }

  @Post('course/:courseId/bookmarks')
  @ApiOperation({ summary: 'Add a bookmark' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'Bookmark added' })
  async addBookmark(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: AddBookmarkDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.progressService.addBookmark(userId, courseId, dto.lessonId, dto.timestamp, dto.note);
  }

  @Delete('course/:courseId/bookmarks/:lessonId')
  @ApiOperation({ summary: 'Remove a bookmark' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiParam({ name: 'lessonId', description: 'Lesson UUID' })
  @ApiResponse({ status: 200, description: 'Bookmark removed' })
  async removeBookmark(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.progressService.removeBookmark(userId, courseId, lessonId);
  }

  @Patch('course/:courseId/current-lesson/:lessonId')
  @ApiOperation({ summary: 'Update current lesson' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiParam({ name: 'lessonId', description: 'Lesson UUID' })
  @ApiResponse({ status: 200, description: 'Current lesson updated' })
  async updateCurrentLesson(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.progressService.updateCurrentLesson(userId, courseId, lessonId);
  }

  @Post('course/:courseId/drop')
  @ApiOperation({ summary: 'Drop a course' })
  @ApiParam({ name: 'courseId', description: 'Course UUID' })
  @ApiResponse({ status: 200, description: 'Course dropped' })
  async dropCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.progressService.dropCourse(userId, courseId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get XP leaderboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Leaderboard' })
  async getLeaderboard(@Query('limit') limit?: number) {
    return this.progressService.getLeaderboard(limit || 10);
  }
}
