import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query 
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AttributionModel, ConversionType } from '../../entities/MarketingAttribution.entity';

@Controller('marketing/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Attribution Tracking
  @Post('track-attribution')
  async trackAttribution(
    @Body('userId') userId: string,
    @Body('conversionType') conversionType: ConversionType,
    @Body('conversionValue') conversionValue: number,
    @Body('utmParams') utmParams: any,
    @Body('requestData') requestData: any
  ) {
    return this.analyticsService.trackAttribution(
      userId,
      conversionType,
      conversionValue,
      utmParams,
      requestData
    );
  }

  @Post('add-touchpoint')
  async addTouchpoint(
    @Body('userId') userId: string,
    @Body('touchpoint') touchpoint: any
  ) {
    await this.analyticsService.addTouchpoint(userId, touchpoint);
    return { success: true };
  }

  @Post('calculate-multi-touch-attribution')
  async calculateMultiTouchAttribution(
    @Body('userId') userId: string,
    @Body('model') model: AttributionModel
  ) {
    const weights = await this.analyticsService.calculateMultiTouchAttribution(userId, model);
    return { weights };
  }

  // Campaign Performance
  @Post('record-campaign-performance')
  async recordCampaignPerformance(
    @Body('campaignId') campaignId: string,
    @Body('campaignName') campaignName: string,
    @Body('campaignType') campaignType: string,
    @Body('channel') channel: string,
    @Body('metrics') metrics: any
  ) {
    return this.analyticsService.recordCampaignPerformance(
      campaignId,
      campaignName,
      campaignType,
      channel,
      metrics
    );
  }

  // Cohort Analysis
  @Get('cohort-analysis')
  async getCohortAnalysis(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy: 'week' | 'month' = 'month'
  ) {
    return this.analyticsService.getCohortAnalysis(
      new Date(startDate),
      new Date(endDate),
      groupBy
    );
  }

  // Channel Performance
  @Get('channel-performance')
  async getChannelPerformance(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.analyticsService.getChannelPerformance(
      new Date(startDate),
      new Date(endDate)
    );
  }

  // Conversion Funnel
  @Get('conversion-funnel')
  async getConversionFunnel(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.analyticsService.getConversionFunnel(
      new Date(startDate),
      new Date(endDate)
    );
  }

  // ROI Calculation
  @Get('campaign-roi')
  async calculateCampaignROI(
    @Query('campaignId') campaignId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.analyticsService.calculateCampaignROI(
      campaignId,
      new Date(startDate),
      new Date(endDate)
    );
  }
}
