import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService, AnalyticsPeriod } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my profile analytics' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  getMyAnalytics(@CurrentUser('userId') userId: string, @Query('period') period: AnalyticsPeriod = AnalyticsPeriod.MONTH) {
    return this.analyticsService.getProfileAnalytics(userId, period);
  }

  @Get('profile/:userId')
  @ApiOperation({ summary: 'Get user profile analytics' })
  @ApiParam({ name: 'userId' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  getUserAnalytics(@Param('userId') userId: string, @Query('period') period: AnalyticsPeriod = AnalyticsPeriod.MONTH) {
    return this.analyticsService.getProfileAnalytics(userId, period);
  }

  @Get('trading')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my trading analytics' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  getMyTradingAnalytics(@CurrentUser('userId') userId: string, @Query('period') period: AnalyticsPeriod = AnalyticsPeriod.MONTH) {
    return this.analyticsService.getTradingAnalytics(userId, period);
  }

  @Get('copy-trading')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my copy trading analytics' })
  getCopyTradingAnalytics(@CurrentUser('userId') userId: string) {
    return this.analyticsService.getCopyTradingAnalytics(userId);
  }

  @Get('engagement')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my engagement analytics' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  getEngagementAnalytics(@CurrentUser('userId') userId: string, @Query('period') period: AnalyticsPeriod = AnalyticsPeriod.MONTH) {
    return this.analyticsService.getEngagementAnalytics(userId, period);
  }
}
