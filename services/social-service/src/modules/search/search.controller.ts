import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService, SearchType } from './search.service';
import { PaginationDto } from '../../common/dto';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search users, posts, channels' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'type', enum: SearchType, required: false })
  search(@Query('q') query: string, @Query('type') type: SearchType = SearchType.ALL, @Query() pagination: PaginationDto) {
    return this.searchService.search(query, type, pagination);
  }

  @Get('users')
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({ name: 'q', required: true })
  searchUsers(@Query('q') query: string, @Query() pagination: PaginationDto) {
    return this.searchService.searchUsers(query, pagination);
  }

  @Get('posts')
  @ApiOperation({ summary: 'Search posts' })
  @ApiQuery({ name: 'q', required: true })
  searchPosts(@Query('q') query: string, @Query() pagination: PaginationDto) {
    return this.searchService.searchPosts(query, pagination);
  }

  @Get('channels')
  @ApiOperation({ summary: 'Search channels' })
  @ApiQuery({ name: 'q', required: true })
  searchChannels(@Query('q') query: string, @Query() pagination: PaginationDto) {
    return this.searchService.searchChannels(query, pagination);
  }

  @Get('hashtag/:tag')
  @ApiOperation({ summary: 'Search by hashtag' })
  searchByHashtag(@Query('tag') tag: string, @Query() pagination: PaginationDto) {
    return this.searchService.searchByHashtag(tag, pagination);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending hashtags' })
  @ApiQuery({ name: 'limit', required: false })
  getTrending(@Query('limit') limit?: number) {
    return this.searchService.getTrendingHashtags(limit);
  }
}
