import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query,
  Ip,
  Headers,
  UseGuards 
} from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralCampaign } from '../../entities/ReferralCampaign.entity';

@Controller('marketing/referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // Campaign Management
  @Post('campaigns')
  async createCampaign(@Body() data: Partial<ReferralCampaign>) {
    return this.referralService.createCampaign(data);
  }

  @Put('campaigns/:id')
  async updateCampaign(
    @Param('id') id: string,
    @Body() data: Partial<ReferralCampaign>
  ) {
    return this.referralService.updateCampaign(id, data);
  }

  @Post('campaigns/:id/activate')
  async activateCampaign(@Param('id') id: string) {
    return this.referralService.activateCampaign(id);
  }

  @Post('campaigns/:id/pause')
  async pauseCampaign(@Param('id') id: string) {
    return this.referralService.pauseCampaign(id);
  }

  @Post('campaigns/:id/end')
  async endCampaign(@Param('id') id: string) {
    return this.referralService.endCampaign(id);
  }

  @Get('campaigns/:id/performance')
  async getCampaignPerformance(@Param('id') id: string) {
    return this.referralService.getCampaignPerformance(id);
  }

  // Referral Link Management
  @Post('links/generate')
  async generateReferralLink(
    @Body('userId') userId: string,
    @Body('campaignId') campaignId: string,
    @Body('customCode') customCode?: string,
    @Body('utmParams') utmParams?: any
  ) {
    return this.referralService.generateReferralLink(
      userId,
      campaignId,
      customCode,
      utmParams
    );
  }

  @Post('track-click')
  async trackClick(
    @Body('referralCode') referralCode: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string
  ) {
    await this.referralService.trackClick(referralCode, ipAddress, userAgent);
    return { success: true };
  }

  // Referral Creation
  @Post('create')
  async createReferral(
    @Body('referralCode') referralCode: string,
    @Body('referredUserId') referredUserId: string,
    @Body('clickData') clickData: any,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string
  ) {
    const fullClickData = {
      ...clickData,
      ipAddress,
      userAgent,
    };
    return this.referralService.createReferral(referralCode, referredUserId, fullClickData);
  }

  @Post('referrals/:id/qualify')
  async qualifyReferral(@Param('id') id: string) {
    return this.referralService.qualifyReferral(id);
  }

  // Commission Management
  @Post('commissions/:id/approve')
  async approveCommission(
    @Param('id') id: string,
    @Body('approvedBy') approvedBy: string
  ) {
    return this.referralService.approveCommission(id, approvedBy);
  }

  @Post('commissions/:id/pay')
  async payCommission(
    @Param('id') id: string,
    @Body('payoutDetails') payoutDetails: any
  ) {
    return this.referralService.payCommission(id, payoutDetails);
  }

  // Analytics & Leaderboard
  @Get('leaderboard')
  async getLeaderboard(
    @Query('campaignId') campaignId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number
  ) {
    return this.referralService.getLeaderboard(
      campaignId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit || 100
    );
  }

  @Get('analytics/:userId')
  async getReferralAnalytics(
    @Param('userId') userId: string,
    @Query('campaignId') campaignId?: string
  ) {
    return this.referralService.getReferralAnalytics(userId, campaignId);
  }

  @Get('stats')
  async getStats(@Query('userId') userId: string, @Query('campaignId') campaignId?: string) {
    return this.referralService.getReferralAnalytics(userId, campaignId);
  }
}
