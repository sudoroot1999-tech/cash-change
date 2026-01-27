import { analyticsDb } from '../config/database';
import { CampaignPerformance } from '../models/types';
import { logger } from '../utils/logger';
import { CacheService } from './cache-service';

export class MarketingService {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  async getMarketingReport(startDate: Date, endDate: Date): Promise<any> {
    const cacheKey = `marketing:report:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Campaign performance
      const campaigns = await analyticsDb('campaign_performance')
        .whereBetween('start_date', [startDate, endDate])
        .orderBy('roi', 'desc');

      // Referral stats
      const referralStats = await analyticsDb('referral_stats')
        .whereBetween('measured_date', [startDate, endDate])
        .orderBy('measured_date', 'desc');

      // Conversion funnels
      const funnels = await analyticsDb('conversion_funnels')
        .whereBetween('measured_date', [startDate, endDate])
        .orderBy('measured_date', 'desc');

      // Calculate totals
      const totalSpend = campaigns.reduce((sum, c) => sum + parseFloat(c.spend), 0);
      const totalRevenue = campaigns.reduce((sum, c) => sum + parseFloat(c.revenue), 0);
      const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
      const avgROI = campaigns.length > 0 
        ? campaigns.reduce((sum, c) => sum + parseFloat(c.roi), 0) / campaigns.length 
        : 0;

      // CAC calculation
      const totalNewUsers = referralStats.reduce((sum, rs) => sum + rs.successful_referrals, 0);
      const cac = totalNewUsers > 0 ? totalSpend / totalNewUsers : 0;

      // Channel performance
      const channelPerformance = await this.getChannelPerformance(campaigns);

      const report = {
        period: { start: startDate, end: endDate },
        overview: {
          total_spend: totalSpend,
          total_revenue: totalRevenue,
          total_conversions: totalConversions,
          avg_roi: avgROI,
          cac: cac,
        },
        campaigns: campaigns.map((c) => ({
          id: c.campaign_id,
          name: c.campaign_name,
          channel: c.channel,
          spend: parseFloat(c.spend),
          revenue: parseFloat(c.revenue),
          conversions: c.conversions,
          roi: parseFloat(c.roi),
          ctr: c.clicks > 0 ? (c.clicks / c.impressions) * 100 : 0,
          conversion_rate: c.clicks > 0 ? (c.conversions / c.clicks) * 100 : 0,
        })),
        channel_performance: channelPerformance,
        referral_program: {
          total_referrers: referralStats.reduce((sum, rs) => sum + rs.total_referrers, 0),
          total_referrals: referralStats.reduce((sum, rs) => sum + rs.total_referrals, 0),
          successful_referrals: referralStats.reduce((sum, rs) => sum + rs.successful_referrals, 0),
          total_rewards: referralStats.reduce((sum, rs) => sum + parseFloat(rs.total_rewards_paid), 0),
          referral_revenue: referralStats.reduce((sum, rs) => sum + parseFloat(rs.referral_revenue), 0),
        },
        conversion_funnels: funnels.map((f) => ({
          name: f.funnel_name,
          date: f.measured_date,
          steps: [
            { name: 'Landing Page', count: f.step_1_count },
            { name: 'Registration', count: f.step_2_count },
            { name: 'KYC', count: f.step_3_count },
            { name: 'First Deposit', count: f.step_4_count },
            { name: 'First Trade', count: f.step_5_count },
          ],
          conversion_rate: parseFloat(f.conversion_rate),
        })),
      };

      await this.cacheService.set(cacheKey, report, 600); // Cache for 10 minutes
      return report;
    } catch (error) {
      logger.error('Error getting marketing report', error);
      throw error;
    }
  }

  async getCampaignPerformance(campaignId?: string): Promise<CampaignPerformance[]> {
    try {
      let query = analyticsDb('campaign_performance').orderBy('start_date', 'desc');

      if (campaignId) {
        query = query.where('campaign_id', campaignId);
      }

      const campaigns = await query;

      return campaigns.map((c) => ({
        campaign_id: c.campaign_id,
        campaign_name: c.campaign_name,
        channel: c.channel,
        start_date: c.start_date,
        end_date: c.end_date,
        budget: parseFloat(c.budget),
        spend: parseFloat(c.spend),
        impressions: c.impressions,
        clicks: c.clicks,
        conversions: c.conversions,
        revenue: parseFloat(c.revenue),
        cac: parseFloat(c.cac),
        roi: parseFloat(c.roi),
        campaign_data: c.campaign_data || {},
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));
    } catch (error) {
      logger.error('Error getting campaign performance', error);
      throw error;
    }
  }

  async getReferralStats(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      return await analyticsDb('referral_stats')
        .whereBetween('measured_date', [startDate, endDate])
        .orderBy('measured_date', 'desc');
    } catch (error) {
      logger.error('Error getting referral stats', error);
      throw error;
    }
  }

  async getConversionFunnels(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      return await analyticsDb('conversion_funnels')
        .whereBetween('measured_date', [startDate, endDate])
        .orderBy('measured_date', 'desc');
    } catch (error) {
      logger.error('Error getting conversion funnels', error);
      throw error;
    }
  }

  private async getChannelPerformance(campaigns: any[]): Promise<Record<string, any>> {
    const channels: Record<string, any> = {};

    campaigns.forEach((campaign) => {
      const channel = campaign.channel;
      if (!channels[channel]) {
        channels[channel] = {
          spend: 0,
          revenue: 0,
          conversions: 0,
          impressions: 0,
          clicks: 0,
        };
      }

      channels[channel].spend += parseFloat(campaign.spend);
      channels[channel].revenue += parseFloat(campaign.revenue);
      channels[channel].conversions += campaign.conversions;
      channels[channel].impressions += campaign.impressions;
      channels[channel].clicks += campaign.clicks;
    });

    // Calculate ROI and CTR for each channel
    Object.keys(channels).forEach((channel) => {
      const data = channels[channel];
      data.roi = data.spend > 0 ? ((data.revenue - data.spend) / data.spend) * 100 : 0;
      data.ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
      data.conversion_rate = data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0;
    });

    return channels;
  }

  async updateCampaign(campaignId: string, data: Partial<CampaignPerformance>): Promise<void> {
    try {
      await analyticsDb('campaign_performance')
        .where('campaign_id', campaignId)
        .update({
          ...data,
          updated_at: new Date(),
        });

      logger.info(`Campaign ${campaignId} updated`);
    } catch (error) {
      logger.error('Error updating campaign', error);
      throw error;
    }
  }
}
