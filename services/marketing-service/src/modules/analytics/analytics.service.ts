import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { 
  MarketingAttribution, 
  AttributionModel,
  ConversionType 
} from '../../entities/MarketingAttribution.entity';
import { CampaignPerformance } from '../../entities/CampaignPerformance.entity';
import * as Mixpanel from 'mixpanel';

@Injectable()
export class AnalyticsService {
  private mixpanel: any;

  constructor(
    @InjectRepository(MarketingAttribution)
    private attributionRepo: Repository<MarketingAttribution>,
    @InjectRepository(CampaignPerformance)
    private performanceRepo: Repository<CampaignPerformance>,
  ) {
    if (process.env.MIXPANEL_TOKEN) {
      this.mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);
    }
  }

  // UTM Tracking
  async trackAttribution(
    userId: string,
    conversionType: ConversionType,
    conversionValue: number,
    utmParams: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
    },
    requestData: {
      referrer?: string;
      landingPage?: string;
      ipAddress?: string;
      userAgent?: string;
      device?: any;
      country?: string;
      city?: string;
    }
  ): Promise<MarketingAttribution> {
    // Determine channel from UTM parameters
    const channel = this.determineChannel(utmParams);

    const attribution = this.attributionRepo.create({
      userId,
      conversionType,
      conversionValue,
      channel,
      source: utmParams.source,
      medium: utmParams.medium,
      campaign: utmParams.campaign,
      term: utmParams.term,
      content: utmParams.content,
      referrer: requestData.referrer,
      landingPage: requestData.landingPage,
      ipAddress: requestData.ipAddress,
      userAgent: requestData.userAgent,
      device: requestData.device,
      country: requestData.country,
      city: requestData.city,
      conversionDate: new Date(),
      touchpoints: [],
      attributionModel: AttributionModel.LAST_TOUCH,
    });

    const saved = await this.attributionRepo.save(attribution);

    // Track in Mixpanel
    if (this.mixpanel) {
      this.mixpanel.track('Conversion', {
        distinct_id: userId,
        conversionType,
        conversionValue,
        channel,
        source: utmParams.source,
        medium: utmParams.medium,
        campaign: utmParams.campaign,
      });
    }

    return saved;
  }

  private determineChannel(utmParams: any): string {
    if (utmParams.medium === 'cpc' || utmParams.medium === 'ppc') {
      return 'paid';
    }
    if (utmParams.medium === 'social' || utmParams.source?.match(/facebook|twitter|linkedin|instagram/i)) {
      return 'social';
    }
    if (utmParams.medium === 'email') {
      return 'email';
    }
    if (utmParams.source === 'referral' || utmParams.medium === 'referral') {
      return 'referral';
    }
    if (utmParams.source === 'organic' || utmParams.medium === 'organic') {
      return 'organic';
    }
    if (!utmParams.source && !utmParams.medium) {
      return 'direct';
    }
    return 'other';
  }

  // Multi-Touch Attribution
  async addTouchpoint(
    userId: string,
    touchpoint: {
      channel: string;
      source?: string;
      medium?: string;
      campaign?: string;
      referrer?: string;
      landingPage?: string;
    }
  ): Promise<void> {
    // Find or create attribution record for user
    let attribution = await this.attributionRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' }
    });

    if (!attribution) {
      // Create preliminary attribution
      attribution = this.attributionRepo.create({
        userId,
        conversionType: ConversionType.REGISTRATION,
        channel: touchpoint.channel,
        source: touchpoint.source,
        medium: touchpoint.medium,
        campaign: touchpoint.campaign,
        referrer: touchpoint.referrer,
        landingPage: touchpoint.landingPage,
        touchpoints: [],
        conversionDate: new Date(),
      });
    }

    const touchpoints = attribution.touchpoints || [];
    touchpoints.push({
      timestamp: new Date(),
      channel: touchpoint.channel,
      source: touchpoint.source,
      medium: touchpoint.medium,
      campaign: touchpoint.campaign,
      referrer: touchpoint.referrer,
      landingPage: touchpoint.landingPage,
    });

    attribution.touchpoints = touchpoints;
    await this.attributionRepo.save(attribution);
  }

  async calculateMultiTouchAttribution(
    userId: string,
    model: AttributionModel
  ): Promise<Record<string, number>> {
    const attribution = await this.attributionRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' }
    });

    if (!attribution || !attribution.touchpoints?.length) {
      return {};
    }

    const touchpoints = attribution.touchpoints;
    const weights: Record<string, number> = {};

    switch (model) {
      case AttributionModel.FIRST_TOUCH:
        weights[touchpoints[0].channel] = 100;
        break;

      case AttributionModel.LAST_TOUCH:
        weights[touchpoints[touchpoints.length - 1].channel] = 100;
        break;

      case AttributionModel.LINEAR:
        const equalWeight = 100 / touchpoints.length;
        touchpoints.forEach(tp => {
          weights[tp.channel] = (weights[tp.channel] || 0) + equalWeight;
        });
        break;

      case AttributionModel.TIME_DECAY:
        const totalWeight = touchpoints.length * (touchpoints.length + 1) / 2;
        touchpoints.forEach((tp, index) => {
          const weight = ((index + 1) / totalWeight) * 100;
          weights[tp.channel] = (weights[tp.channel] || 0) + weight;
        });
        break;

      case AttributionModel.U_SHAPED:
        // 40% first, 40% last, 20% middle
        if (touchpoints.length === 1) {
          weights[touchpoints[0].channel] = 100;
        } else if (touchpoints.length === 2) {
          weights[touchpoints[0].channel] = 50;
          weights[touchpoints[1].channel] = 50;
        } else {
          weights[touchpoints[0].channel] = 40;
          weights[touchpoints[touchpoints.length - 1].channel] = 40;
          const middleWeight = 20 / (touchpoints.length - 2);
          for (let i = 1; i < touchpoints.length - 1; i++) {
            weights[touchpoints[i].channel] = (weights[touchpoints[i].channel] || 0) + middleWeight;
          }
        }
        break;

      case AttributionModel.W_SHAPED:
        // 30% first, 30% middle (conversion), 30% last, 10% others
        if (touchpoints.length === 1) {
          weights[touchpoints[0].channel] = 100;
        } else if (touchpoints.length === 2) {
          weights[touchpoints[0].channel] = 50;
          weights[touchpoints[1].channel] = 50;
        } else {
          weights[touchpoints[0].channel] = 30;
          const middleIndex = Math.floor(touchpoints.length / 2);
          weights[touchpoints[middleIndex].channel] = 30;
          weights[touchpoints[touchpoints.length - 1].channel] = 30;
          const remainingWeight = 10 / (touchpoints.length - 3);
          touchpoints.forEach((tp, i) => {
            if (i !== 0 && i !== middleIndex && i !== touchpoints.length - 1) {
              weights[tp.channel] = (weights[tp.channel] || 0) + remainingWeight;
            }
          });
        }
        break;
    }

    // Update attribution record
    await this.attributionRepo.update(attribution.id, {
      attributionModel: model,
      attributionWeights: weights,
    });

    return weights;
  }

  // Campaign Performance Tracking
  async recordCampaignPerformance(
    campaignId: string,
    campaignName: string,
    campaignType: string,
    channel: string,
    metrics: {
      impressions?: number;
      reach?: number;
      clicks?: number;
      uniqueClicks?: number;
      conversions?: number;
      revenue?: number;
      cost?: number;
      bounces?: number;
      newUsers?: number;
      returningUsers?: number;
      channelMetrics?: any;
    }
  ): Promise<CampaignPerformance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let performance = await this.performanceRepo.findOne({
      where: { campaignId, date: today }
    });

    if (!performance) {
      performance = this.performanceRepo.create({
        campaignId,
        campaignName,
        campaignType,
        channel,
        date: today,
        ...metrics,
      });
    } else {
      Object.assign(performance, metrics);
    }

    // Calculate rates
    performance.clickThroughRate = performance.impressions > 0
      ? (performance.clicks / performance.impressions) * 100
      : 0;

    performance.conversionRate = performance.clicks > 0
      ? (performance.conversions / performance.clicks) * 100
      : 0;

    performance.bounceRate = performance.clicks > 0
      ? (performance.bounces / performance.clicks) * 100
      : 0;

    if (metrics.revenue && metrics.cost) {
      performance.returnOnAdSpend = metrics.cost > 0 ? (metrics.revenue / metrics.cost) : 0;
      performance.returnOnInvestment = metrics.cost > 0
        ? ((metrics.revenue - metrics.cost) / metrics.cost) * 100
        : 0;
    }

    if (metrics.conversions && performance.clicks > 0) {
      performance.costPerClick = metrics.cost ? metrics.cost / performance.clicks : 0;
      performance.costPerAcquisition = metrics.cost && metrics.conversions > 0
        ? metrics.cost / metrics.conversions
        : 0;
    }

    return this.performanceRepo.save(performance);
  }

  // Cohort Analysis
  async getCohortAnalysis(
    startDate: Date,
    endDate: Date,
    groupBy: 'week' | 'month' = 'month'
  ): Promise<any[]> {
    const attributions = await this.attributionRepo.find({
      where: {
        conversionDate: Between(startDate, endDate)
      },
      order: { conversionDate: 'ASC' }
    });

    const cohorts: Map<string, any> = new Map();

    attributions.forEach(attr => {
      const date = new Date(attr.conversionDate);
      const cohortKey = groupBy === 'week'
        ? this.getWeekKey(date)
        : this.getMonthKey(date);

      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, {
          cohort: cohortKey,
          users: 0,
          totalRevenue: 0,
          averageRevenue: 0,
          channels: {},
        });
      }

      const cohort = cohorts.get(cohortKey);
      cohort.users++;
      cohort.totalRevenue += Number(attr.conversionValue);
      
      if (!cohort.channels[attr.channel]) {
        cohort.channels[attr.channel] = 0;
      }
      cohort.channels[attr.channel]++;
    });

    // Calculate averages
    cohorts.forEach(cohort => {
      cohort.averageRevenue = cohort.users > 0 ? cohort.totalRevenue / cohort.users : 0;
    });

    return Array.from(cohorts.values());
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = Math.ceil(
      ((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7
    );
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  // Channel Performance
  async getChannelPerformance(
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    return this.performanceRepo
      .createQueryBuilder('perf')
      .select('perf.channel', 'channel')
      .addSelect('SUM(perf.impressions)', 'totalImpressions')
      .addSelect('SUM(perf.clicks)', 'totalClicks')
      .addSelect('SUM(perf.conversions)', 'totalConversions')
      .addSelect('SUM(perf.revenue)', 'totalRevenue')
      .addSelect('SUM(perf.cost)', 'totalCost')
      .addSelect('AVG(perf.clickThroughRate)', 'avgClickThroughRate')
      .addSelect('AVG(perf.conversionRate)', 'avgConversionRate')
      .addSelect('AVG(perf.returnOnAdSpend)', 'avgRoas')
      .where('perf.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('perf.channel')
      .orderBy('totalRevenue', 'DESC')
      .getRawMany();
  }

  // Conversion Funnel Analysis
  async getConversionFunnel(
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const registrations = await this.attributionRepo.count({
      where: {
        conversionType: ConversionType.REGISTRATION,
        conversionDate: Between(startDate, endDate)
      }
    });

    const kycCompletions = await this.attributionRepo.count({
      where: {
        conversionType: ConversionType.KYC_COMPLETION,
        conversionDate: Between(startDate, endDate)
      }
    });

    const firstDeposits = await this.attributionRepo.count({
      where: {
        conversionType: ConversionType.FIRST_DEPOSIT,
        conversionDate: Between(startDate, endDate)
      }
    });

    const firstTrades = await this.attributionRepo.count({
      where: {
        conversionType: ConversionType.FIRST_TRADE,
        conversionDate: Between(startDate, endDate)
      }
    });

    return {
      registrations,
      kycCompletions,
      firstDeposits,
      firstTrades,
      kycRate: registrations > 0 ? (kycCompletions / registrations) * 100 : 0,
      depositRate: kycCompletions > 0 ? (firstDeposits / kycCompletions) * 100 : 0,
      tradeRate: firstDeposits > 0 ? (firstTrades / firstDeposits) * 100 : 0,
      overallConversionRate: registrations > 0 ? (firstTrades / registrations) * 100 : 0,
    };
  }

  // ROI Calculation
  async calculateCampaignROI(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const performances = await this.performanceRepo.find({
      where: {
        campaignId,
        date: Between(startDate, endDate)
      }
    });

    const totalCost = performances.reduce((sum, p) => sum + Number(p.cost), 0);
    const totalRevenue = performances.reduce((sum, p) => sum + Number(p.revenue), 0);
    const totalConversions = performances.reduce((sum, p) => sum + p.conversions, 0);
    const totalClicks = performances.reduce((sum, p) => sum + p.clicks, 0);

    return {
      campaignId,
      period: { startDate, endDate },
      totalCost,
      totalRevenue,
      totalConversions,
      totalClicks,
      roi: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0,
      roas: totalCost > 0 ? totalRevenue / totalCost : 0,
      costPerAcquisition: totalConversions > 0 ? totalCost / totalConversions : 0,
      costPerClick: totalClicks > 0 ? totalCost / totalClicks : 0,
    };
  }
}
