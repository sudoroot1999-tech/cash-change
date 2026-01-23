import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FraudDetectionService } from './services';
import {
  CreateReferralCodeDto,
  UseReferralCodeDto,
  ReferralStatsQueryDto,
  LeaderboardQueryDto,
  TradeCommissionDto,
} from './dto';
import { ReferralService } from './referral.service';
import { RequireAuth } from '@exchange/common';

@ApiTags('Referral')
@Controller('referral')
@RequireAuth()
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly fraudService: FraudDetectionService,
  ) {}

  @Get('code')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user referral code' })
  @ApiResponse({ status: 200, description: 'Referral code retrieved successfully' })
  async getReferralCode(@Request() req) {
    return await this.referralService.getUserReferralCode(req.user.userId);
  }

  @Post('code')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create custom referral code' })
  @ApiResponse({ status: 201, description: 'Referral code created successfully' })
  async createReferralCode(@Request() req, @Body() dto: CreateReferralCodeDto) {
    return await this.referralService.createReferralCode(req.user.userId, dto);
  }

  @Post('use')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Use a referral code' })
  @ApiResponse({ status: 201, description: 'Referral code applied successfully' })
  @ApiResponse({ status: 400, description: 'Invalid referral code or already used' })
  async useReferralCode(@Request() req, @Body() dto: UseReferralCodeDto) {
    // Check for fraud before creating relationship
    const referralCode = await this.referralService.findReferralByCode(dto);

    if (referralCode) {
      const fraudCheck = await this.fraudService.checkNewReferral(
        referralCode.userId,
        req.user.userId,
        dto.ipAddress,
        dto.deviceFingerprint,
      );

      if (fraudCheck.isSuspicious && fraudCheck.riskScore >= 0.9) {
        return {
          success: false,
          message: 'Unable to process referral. Please contact support.',
          fraudDetected: true,
        };
      }
    }

    const relationship = await this.referralService.useReferralCode(req.user.userId, dto);
    return {
      success: true,
      relationship,
    };
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get referral statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Request() req, @Query() query: ReferralStatsQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    
    return await this.referralService.getReferralStats(req.user.userId, startDate, endDate);
  }

  @Get('earnings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get referral earnings' })
  @ApiResponse({ status: 200, description: 'Earnings retrieved successfully' })
  async getEarnings(@Request() req) {
    return await this.referralService.getUserEarnings(req.user.userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get referral leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully' })
  @ApiQuery({ name: 'period', enum: ['daily', 'weekly', 'monthly', 'all_time'], required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'metric', enum: ['referrals', 'earnings', 'volume'], required: false })
  async getLeaderboard(@Query() query: LeaderboardQueryDto) {
    return await this.referralService.getLeaderboard(
      query.period || 'monthly',
      query.limit || 100,
      query.metric || 'earnings',
    );
  }

  @Post('commission/trade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process trade commission (internal use)' })
  @ApiResponse({ status: 200, description: 'Commission processed successfully' })
  async processTradeCommission(@Body() dto: TradeCommissionDto) {
    // This endpoint should be protected by internal API key in production
    await this.referralService.processTradeCommission(dto);
    return { success: true, message: 'Commission processed' };
  }

  @Get('referrals')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user referrals list' })
  @ApiResponse({ status: 200, description: 'Referrals list retrieved successfully' })
  async getReferrals(@Request() req) {
    const stats = await this.referralService.getReferralStats(req.user.userId);
    return {
      referrals: stats.recentReferrals,
      total: stats.overview.totalReferrals,
    };
  }
}
