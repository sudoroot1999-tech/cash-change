import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param 
} from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { AffiliateProgram } from '../../entities/AffiliateProgram.entity';

@Controller('marketing/affiliate')
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  // Program Management
  @Post('programs')
  async createProgram(@Body() data: Partial<AffiliateProgram>) {
    return this.affiliateService.createProgram(data);
  }

  @Put('programs/:id')
  async updateProgram(
    @Param('id') id: string,
    @Body() data: Partial<AffiliateProgram>
  ) {
    return this.affiliateService.updateProgram(id, data);
  }

  @Get('programs/:id')
  async getProgram(@Param('id') id: string) {
    return this.affiliateService.getProgram(id);
  }

  @Get('programs')
  async getActivePrograms() {
    return this.affiliateService.getActivePrograms();
  }

  @Get('programs/:id/analytics')
  async getProgramAnalytics(@Param('id') id: string) {
    return this.affiliateService.getProgramAnalytics(id);
  }

  // Affiliate Registration
  @Post('register')
  async registerAffiliate(
    @Body('userId') userId: string,
    @Body('programId') programId: string,
    @Body('applicationData') applicationData: any
  ) {
    return this.affiliateService.registerAffiliate(userId, programId, applicationData);
  }

  @Post('affiliates/:id/approve')
  async approveAffiliate(
    @Param('id') id: string,
    @Body('approvedBy') approvedBy: string
  ) {
    return this.affiliateService.approveAffiliate(id, approvedBy);
  }

  @Post('affiliates/:id/reject')
  async rejectAffiliate(
    @Param('id') id: string,
    @Body('reason') reason: string
  ) {
    return this.affiliateService.rejectAffiliate(id, reason);
  }

  @Post('affiliates/:id/suspend')
  async suspendAffiliate(
    @Param('id') id: string,
    @Body('reason') reason: string
  ) {
    return this.affiliateService.suspendAffiliate(id, reason);
  }

  @Post('affiliates/:id/reactivate')
  async reactivateAffiliate(@Param('id') id: string) {
    return this.affiliateService.reactivateAffiliate(id);
  }

  // Tracking
  @Post('track/click')
  async trackClick(@Body('affiliateCode') affiliateCode: string) {
    await this.affiliateService.trackClick(affiliateCode);
    return { success: true };
  }

  @Post('track/conversion')
  async trackConversion(
    @Body('affiliateCode') affiliateCode: string,
    @Body('userId') userId: string,
    @Body('revenue') revenue: number
  ) {
    await this.affiliateService.trackConversion(affiliateCode, userId, revenue);
    return { success: true };
  }

  // Payouts
  @Post('affiliates/:id/payout')
  async processPayout(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('payoutDetails') payoutDetails: any
  ) {
    await this.affiliateService.processPayout(id, amount, payoutDetails);
    return { success: true };
  }

  @Get('affiliates/:id/payout-schedule')
  async getPayoutSchedule(@Param('id') id: string) {
    return this.affiliateService.getPayoutSchedule(id);
  }

  // Landing Pages
  @Post('affiliates/:id/landing-pages')
  async createLandingPage(
    @Param('id') id: string,
    @Body('name') name: string,
    @Body('url') url: string
  ) {
    return this.affiliateService.createLandingPage(id, name, url);
  }

  @Put('affiliates/:affiliateId/landing-pages/:landingPageId')
  async updateLandingPage(
    @Param('affiliateId') affiliateId: string,
    @Param('landingPageId') landingPageId: string,
    @Body() updates: any
  ) {
    return this.affiliateService.updateLandingPage(affiliateId, landingPageId, updates);
  }

  // Analytics
  @Get('affiliates/:id/analytics')
  async getAffiliateAnalytics(@Param('id') id: string) {
    return this.affiliateService.getAffiliateAnalytics(id);
  }

  // API Access
  @Post('affiliates/:id/regenerate-api-key')
  async regenerateApiKey(@Param('id') id: string) {
    const apiKey = await this.affiliateService.regenerateApiKey(id);
    return { apiKey };
  }

  @Post('validate-api-key')
  async validateApiKey(@Body('apiKey') apiKey: string) {
    const affiliate = await this.affiliateService.validateApiKey(apiKey);
    return { valid: !!affiliate, affiliate };
  }
}
