import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewStatus } from '../../database/entities';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review' })
  async create(@Body() createDto: any, @CurrentUser('userId') userId: string) {
    return this.reviewService.create(userId, createDto);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get reviews for a course' })
  async findByCourse(@Param('courseId', ParseUUIDPipe) courseId: string, @Query() paginationDto: PaginationDto) {
    return this.reviewService.findByCourse(courseId, paginationDto);
  }

  @Get('course/:courseId/stats')
  @ApiOperation({ summary: 'Get review stats for a course' })
  async getCourseStats(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.reviewService.getCourseStats(courseId);
  }

  @Get('course/:courseId/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my review for a course' })
  async getMyReview(@Param('courseId', ParseUUIDPipe) courseId: string, @CurrentUser('userId') userId: string) {
    return this.reviewService.getUserReview(userId, courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get review by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) { return this.reviewService.findOne(id); }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: any, @CurrentUser('userId') userId: string) {
    return this.reviewService.update(id, userId, updateDto);
  }

  @Post(':id/helpful')
  @ApiOperation({ summary: 'Mark review as helpful' })
  async markHelpful(@Param('id', ParseUUIDPipe) id: string, @Body('helpful') helpful: boolean) {
    return this.reviewService.markHelpful(id, helpful);
  }

  @Post(':id/instructor-response')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add instructor response' })
  async addInstructorResponse(@Param('id', ParseUUIDPipe) id: string, @Body('comment') comment: string) {
    return this.reviewService.addInstructorResponse(id, comment);
  }

  @Patch(':id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderate a review' })
  async moderate(@Param('id', ParseUUIDPipe) id: string, @Body() body: { status: ReviewStatus; note?: string }) {
    return this.reviewService.moderate(id, body.status, body.note);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a review' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('userId') userId: string) {
    return this.reviewService.remove(id, userId);
  }
}
