import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { StoryService } from './story.service';
import { StoryType } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('stories')
@Controller('stories')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a story' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() body: { type: StoryType; mediaUrl?: string; content?: string; backgroundColor?: string; textStyle?: any; stickers?: any[]; linkUrl?: string },
  ) {
    return this.storyService.create(userId, body.type, body);
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get stories feed' })
  getFeed(@CurrentUser('userId') userId: string) {
    return this.storyService.getFeedStories(userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user stories' })
  @ApiParam({ name: 'userId' })
  getUserStories(@Param('userId') userId: string, @CurrentUser('userId') viewerId?: string) {
    return this.storyService.getUserStories(userId, viewerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get story by ID' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string, @CurrentUser('userId') userId?: string) {
    return this.storyService.findById(id, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a story' })
  @ApiParam({ name: 'id' })
  delete(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.storyService.delete(id, userId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like/unlike a story' })
  @ApiParam({ name: 'id' })
  like(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.storyService.like(id, userId);
  }
}
