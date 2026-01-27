import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LeaderboardService, LeaderboardType, LeaderboardPeriod } from './leaderboard.service';
import { PaginationDto } from '../../common/dto';

@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get leaderboard' })
  @ApiQuery({ name: 'type', enum: LeaderboardType, required: false })
  @ApiQuery({ name: 'period', enum: LeaderboardPeriod, required: false })
  getLeaderboard(
    @Query('type') type: LeaderboardType = LeaderboardType.PNL,
    @Query('period') period: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME,
    @Query() pagination: PaginationDto,
  ) {
    return this.leaderboardService.getLeaderboard(type, period, pagination);
  }

  @Get('user/:userId/rank')
  @ApiOperation({ summary: 'Get user rank' })
  @ApiParam({ name: 'userId' })
  @ApiQuery({ name: 'type', enum: LeaderboardType, required: false })
  getUserRank(@Param('userId') userId: string, @Query('type') type: LeaderboardType = LeaderboardType.PNL) {
    return this.leaderboardService.getUserRank(userId, type);
  }

  @Get('top-performers')
  @ApiOperation({ summary: 'Get top performers' })
  @ApiQuery({ name: 'limit', required: false })
  getTopPerformers(@Query('limit') limit?: number) {
    return this.leaderboardService.getTopPerformers(limit);
  }

  @Get('rising-stars')
  @ApiOperation({ summary: 'Get rising stars' })
  @ApiQuery({ name: 'limit', required: false })
  getRisingStars(@Query('limit') limit?: number) {
    return this.leaderboardService.getRisingStars(limit);
  }
}
