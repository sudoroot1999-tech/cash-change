import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationDto } from '../../common/dto';

@ApiTags('comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment' })
  create(
    @CurrentUser('userId') userId: string,
    @Body() body: { postId: string; content: string; parentId?: string; mediaUrls?: string[]; mentions?: string[] },
  ) {
    return this.commentService.create(body.postId, userId, body.content, body.parentId, body.mediaUrls, body.mentions);
  }

  @Get('post/:postId')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiParam({ name: 'postId' })
  getPostComments(
    @Param('postId') postId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.commentService.getPostComments(postId, pagination, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by ID' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string, @CurrentUser('userId') userId?: string) {
    return this.commentService.findById(id, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @CurrentUser('userId') userId: string, @Body('content') content: string) {
    return this.commentService.update(id, userId, content);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'id' })
  delete(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.commentService.delete(id, userId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like/unlike a comment' })
  @ApiParam({ name: 'id' })
  like(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.commentService.like(id, userId);
  }
}
