import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PostService } from './post.service';
import { CreatePostDto, UpdatePostDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationDto } from '../../common/dto';

@ApiTags('posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post' })
  create(@CurrentUser('userId') userId: string, @Body() dto: CreatePostDto) {
    return this.postService.create(userId, dto);
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized feed' })
  getFeed(@CurrentUser('userId') userId: string, @Query() pagination: PaginationDto) {
    return this.postService.getFeed(userId, pagination);
  }

  @Get('explore')
  @ApiOperation({ summary: 'Get explore/discover feed' })
  getExploreFeed(
    @Query() pagination: PaginationDto,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.postService.getExploreFeed(pagination, userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get posts by user' })
  @ApiParam({ name: 'userId' })
  getUserPosts(
    @Param('userId') userId: string,
    @Query() pagination: PaginationDto,
    @CurrentUser('userId') currentUserId?: string,
  ) {
    return this.postService.getUserPosts(userId, pagination, currentUserId);
  }

  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get bookmarked posts' })
  getBookmarks(@CurrentUser('userId') userId: string, @Query() pagination: PaginationDto) {
    return this.postService.getBookmarks(userId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by ID' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string, @CurrentUser('userId') userId?: string) {
    return this.postService.findById(id, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post' })
  @ApiParam({ name: 'id' })
  update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a post' })
  @ApiParam({ name: 'id' })
  delete(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.postService.delete(id, userId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like/unlike a post' })
  @ApiParam({ name: 'id' })
  like(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.postService.like(id, userId);
  }

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bookmark/unbookmark a post' })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'collection', required: false })
  bookmark(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Query('collection') collection?: string,
  ) {
    return this.postService.bookmark(id, userId, collection);
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Share a post' })
  @ApiParam({ name: 'id' })
  share(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body('content') content?: string,
  ) {
    return this.postService.share(id, userId, content);
  }

  @Post(':id/pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pin a post to profile' })
  @ApiParam({ name: 'id' })
  pin(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.postService.pin(id, userId);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Increment post views' })
  @ApiParam({ name: 'id' })
  incrementViews(@Param('id') id: string) {
    return this.postService.incrementViews(id);
  }
}
