import {
  Controller,
  Get,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StatisticsService } from '../services/statistics.service';

@ApiTags('P2P Statistics')
@Controller('p2p/statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  async getMyStatistics(@Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.statisticsService.getUserStatistics(userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user statistics by ID' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  async getUserStatistics(@Param('userId') userId: string) {
    return this.statisticsService.getUserStatistics(userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully' })
  async getLeaderboard(@Query('limit') limit: number = 10) {
    return this.statisticsService.getLeaderboard(limit);
  }

  @Get('top-traders')
  @ApiOperation({ summary: 'Get top traders by volume' })
  @ApiResponse({ status: 200, description: 'Top traders retrieved successfully' })
  async getTopTraders(@Query('limit') limit: number = 10) {
    return this.statisticsService.getTopTraders(limit);
  }
}
