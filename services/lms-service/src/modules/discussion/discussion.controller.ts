import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DiscussionService } from './discussion.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DiscussionType } from '../../database/entities';

@ApiTags('discussions')
@Controller('discussions')
export class DiscussionController {
  constructor(private readonly discussionService: DiscussionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a discussion' })
  async create(@Body() createDto: any, @CurrentUser() user: any) {
    return this.discussionService.create({ ...createDto, userId: user.userId, userName: user.email });
  }

  @Get('lesson/:lessonId')
  @ApiOperation({ summary: 'Get discussions for a lesson' })
  async findByLesson(@Param('lessonId', ParseUUIDPipe) lessonId: string, @Query() paginationDto: PaginationDto) {
    return this.discussionService.findByLesson(lessonId, paginationDto);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get discussions for a course' })
  @ApiQuery({ name: 'type', required: false, enum: DiscussionType })
  async findByCourse(@Param('courseId', ParseUUIDPipe) courseId: string, @Query() paginationDto: PaginationDto, @Query('type') type?: DiscussionType) {
    return this.discussionService.findByCourse(courseId, paginationDto, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get discussion by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) { return this.discussionService.findOne(id); }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a discussion' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: any) {
    return this.discussionService.update(id, updateDto);
  }

  @Post(':id/replies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a reply' })
  async addReply(@Param('id', ParseUUIDPipe) id: string, @Body() body: { content: string }, @CurrentUser() user: any) {
    return this.discussionService.addReply(id, user.userId, user.email, body.content);
  }

  @Patch(':id/replies/:replyId/solution')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark reply as solution' })
  async markAsSolution(@Param('id', ParseUUIDPipe) id: string, @Param('replyId') replyId: string) {
    return this.discussionService.markAsSolution(id, replyId);
  }

  @Patch(':id/pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle pin' })
  async togglePin(@Param('id', ParseUUIDPipe) id: string) { return this.discussionService.togglePin(id); }

  @Patch(':id/lock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle lock' })
  async toggleLock(@Param('id', ParseUUIDPipe) id: string) { return this.discussionService.toggleLock(id); }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a discussion' })
  async like(@Param('id', ParseUUIDPipe) id: string) { return this.discussionService.like(id); }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a discussion' })
  async remove(@Param('id', ParseUUIDPipe) id: string) { return this.discussionService.remove(id); }
}
