import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ChannelService } from './channel.service';
import { ChannelType, ChannelCategory, ChannelPostType } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationDto } from '../../common/dto';

@ApiTags('channels')
@Controller('channels')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a channel' })
  create(@CurrentUser('userId') userId: string, @Body() body: { name: string; handle: string; description?: string; avatarUrl?: string; coverImageUrl?: string; type?: ChannelType; category?: ChannelCategory; rules?: string[] }) {
    return this.channelService.create(userId, body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search channels' })
  @ApiQuery({ name: 'q', required: true })
  search(@Query('q') query: string, @Query() pagination: PaginationDto, @CurrentUser('userId') userId?: string) {
    return this.channelService.searchChannels(query, pagination, userId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my subscribed channels' })
  getMyChannels(@CurrentUser('userId') userId: string, @Query() pagination: PaginationDto) {
    return this.channelService.getUserChannels(userId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get channel by ID' })
  @ApiParam({ name: 'id' })
  findById(@Param('id') id: string, @CurrentUser('userId') userId?: string) {
    return this.channelService.findById(id, userId);
  }

  @Get('handle/:handle')
  @ApiOperation({ summary: 'Get channel by handle' })
  @ApiParam({ name: 'handle' })
  findByHandle(@Param('handle') handle: string, @CurrentUser('userId') userId?: string) {
    return this.channelService.findByHandle(handle, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update channel' })
  @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @CurrentUser('userId') userId: string, @Body() updates: { name?: string; description?: string; avatarUrl?: string; coverImageUrl?: string; rules?: string[] }) {
    return this.channelService.update(id, userId, updates);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete channel' })
  @ApiParam({ name: 'id' })
  delete(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.channelService.delete(id, userId);
  }

  @Post(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to channel' })
  @ApiParam({ name: 'id' })
  subscribe(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.channelService.subscribe(id, userId);
  }

  @Delete(':id/subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unsubscribe from channel' })
  @ApiParam({ name: 'id' })
  unsubscribe(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.channelService.unsubscribe(id, userId);
  }

  @Get(':id/subscribers')
  @ApiOperation({ summary: 'Get channel subscribers' })
  @ApiParam({ name: 'id' })
  getSubscribers(@Param('id') id: string, @Query() pagination: PaginationDto) {
    return this.channelService.getSubscribers(id, pagination);
  }

  @Post(':id/posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create channel post' })
  @ApiParam({ name: 'id' })
  createPost(@Param('id') id: string, @CurrentUser('userId') userId: string, @Body() body: { type?: ChannelPostType; content?: string; mediaUrls?: string[]; signalData?: any; pollData?: any }) {
    return this.channelService.createPost(id, userId, body);
  }

  @Get(':id/posts')
  @ApiOperation({ summary: 'Get channel posts' })
  @ApiParam({ name: 'id' })
  getPosts(@Param('id') id: string, @Query() pagination: PaginationDto) {
    return this.channelService.getChannelPosts(id, pagination);
  }
}
