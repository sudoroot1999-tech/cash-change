import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BadgeService } from './badge.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BadgeCategory } from '../../database/entities';

@ApiTags('badges')
@Controller('badges')
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a badge' })
  async create(@Body() createDto: any) { return this.badgeService.create(createDto); }

  @Get()
  @ApiOperation({ summary: 'Get all badges' })
  @ApiQuery({ name: 'category', required: false, enum: BadgeCategory })
  async findAll(@Query('category') category?: BadgeCategory) { return this.badgeService.findAll(category); }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my badges' })
  async getMyBadges(@CurrentUser('userId') userId: string) { return this.badgeService.getUserBadges(userId); }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my stats' })
  async getMyStats(@CurrentUser('userId') userId: string) { return this.badgeService.getUserStats(userId); }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get XP leaderboard' })
  async getLeaderboard(@Query('limit') limit?: number) { return this.badgeService.getLeaderboard(limit || 10); }

  @Get(':id')
  @ApiOperation({ summary: 'Get badge by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) { return this.badgeService.findOne(id); }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a badge' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: any) {
    return this.badgeService.update(id, updateDto);
  }

  @Post(':id/award/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Award badge to user' })
  async awardBadge(@Param('id', ParseUUIDPipe) id: string, @Param('userId') userId: string, @Body() body?: any) {
    return this.badgeService.awardBadge(userId, id, body?.metadata);
  }

  @Patch('my/:badgeId/display')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle badge display on profile' })
  async toggleDisplay(@Param('badgeId', ParseUUIDPipe) badgeId: string, @Body('display') display: boolean, @CurrentUser('userId') userId: string) {
    return this.badgeService.toggleBadgeDisplay(userId, badgeId, display);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a badge' })
  async remove(@Param('id', ParseUUIDPipe) id: string) { return this.badgeService.remove(id); }
}
