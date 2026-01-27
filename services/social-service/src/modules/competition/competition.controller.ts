import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CompetitionService } from './competition.service';
import { CompetitionType } from '../../database/entities';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles, Role } from '../../common/decorators';
import { PaginationDto } from '../../common/dto';

@ApiTags('competitions')
@Controller('competitions')
export class CompetitionController {
  constructor(private readonly competitionService: CompetitionService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a competition (admin only)' })
  create(@Body() body: { title: string; description?: string; imageUrl?: string; type?: CompetitionType; startDate: Date; endDate: Date; entryFee?: number; prizePool?: number; prizeDistribution?: any; maxParticipants?: number; minBalance?: number; allowedPairs?: string[]; rules?: any; isPublic?: boolean }) {
    return this.competitionService.create(body);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active competitions' })
  getActive(@Query() pagination: PaginationDto, @CurrentUser('userId') userId?: string) {
    return this.competitionService.getActiveCompetitions(pagination, userId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming competitions' })
  getUpcoming(@Query() pagination: PaginationDto, @CurrentUser('userId') userId?: string) {
    return this.competitionService.getUpcomingCompetitions(pagination, userId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my competitions' })
  getMy(@CurrentUser('userId') userId: string, @Query() pagination: PaginationDto) {
    return this.competitionService.getMyCompetitions(userId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get competition by ID' })
  @ApiParam({ name: 'id' })
  findById(@Param('id') id: string, @CurrentUser('userId') userId?: string) {
    return this.competitionService.findById(id, userId);
  }

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Get competition leaderboard' })
  @ApiParam({ name: 'id' })
  getLeaderboard(@Param('id') id: string, @Query() pagination: PaginationDto) {
    return this.competitionService.getLeaderboard(id, pagination);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a competition' })
  @ApiParam({ name: 'id' })
  join(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.competitionService.join(id, userId);
  }

  @Delete(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave a competition' })
  @ApiParam({ name: 'id' })
  leave(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.competitionService.leave(id, userId);
  }
}
