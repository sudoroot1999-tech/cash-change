import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AffiliateCampaign } from '../entities';
import { CreateAffiliateCampaignDto, UpdateAffiliateCampaignDto, AffiliateApplicationDto } from '../dto';

@Injectable()
export class AffiliateService {
  constructor(
    @InjectRepository(AffiliateCampaign)
    private readonly campaignRepo: Repository<AffiliateCampaign>,
    private readonly configService: ConfigService,
  ) {}

  async createCampaign(affiliateId: string, dto: CreateAffiliateCampaignDto): Promise<AffiliateCampaign> {
    const campaign = this.campaignRepo.create({
      affiliateId,
      name: dto.name,
      description: dto.description,
      commissionRate: dto.commissionRate,
      customCommissionRates: {
        tier1: dto.tier1Rate,
        tier2: dto.tier2Rate,
      },
      landingPageUrl: dto.landingPageUrl,
      trackingPixel: dto.trackingPixel,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      targetAudience: dto.targetAudience,
      status: 'draft',
    });

    return await this.campaignRepo.save(campaign);
  }

  async updateCampaign(
    campaignId: string,
    affiliateId: string,
    dto: UpdateAffiliateCampaignDto,
  ): Promise<AffiliateCampaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId, affiliateId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    Object.assign(campaign, dto);
    return await this.campaignRepo.save(campaign);
  }

  async getCampaign(campaignId: string, affiliateId: string): Promise<AffiliateCampaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId, affiliateId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async getUserCampaigns(affiliateId: string): Promise<AffiliateCampaign[]> {
    return await this.campaignRepo.find({
      where: { affiliateId },
      order: { createdAt: 'DESC' },
    });
  }

  async getCampaignStats(campaignId: string, affiliateId: string) {
    const campaign = await this.getCampaign(campaignId, affiliateId);

    // Calculate conversion rate
    campaign.conversionRate = campaign.signups > 0 
      ? (campaign.conversions / campaign.signups) * 100 
      : 0;

    await this.campaignRepo.save(campaign);

    return {
      campaign,
      stats: {
        clicks: campaign.clicks,
        signups: campaign.signups,
        conversions: campaign.conversions,
        conversionRate: campaign.conversionRate,
        totalRevenue: campaign.totalRevenue,
        totalCommission: campaign.totalCommission,
        averageCommissionPerConversion: campaign.conversions > 0 
          ? Number(campaign.totalCommission) / campaign.conversions 
          : 0,
        roi: campaign.totalRevenue > 0 
          ? (Number(campaign.totalCommission) / Number(campaign.totalRevenue)) * 100 
          : 0,
      },
      performance: {
        clickThroughRate: campaign.clicks > 0 
          ? (campaign.signups / campaign.clicks) * 100 
          : 0,
        signupToConversionRate: campaign.signups > 0 
          ? (campaign.conversions / campaign.signups) * 100 
          : 0,
      },
    };
  }

  async trackClick(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId, status: 'active' },
    });

    if (campaign) {
      campaign.clicks += 1;
      await this.campaignRepo.save(campaign);
    }
  }

  async trackSignup(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId, status: 'active' },
    });

    if (campaign) {
      campaign.signups += 1;
      await this.campaignRepo.save(campaign);
    }
  }

  async trackConversion(campaignId: string, revenue: number, commission: number): Promise<void> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId, status: 'active' },
    });

    if (campaign) {
      campaign.conversions += 1;
      campaign.totalRevenue = Number(campaign.totalRevenue) + revenue;
      campaign.totalCommission = Number(campaign.totalCommission) + commission;
      campaign.conversionRate = (campaign.conversions / campaign.signups) * 100;
      await this.campaignRepo.save(campaign);
    }
  }

  async submitApplication(userId: string, dto: AffiliateApplicationDto) {
    const minFollowers = this.configService.get<number>('AFFILIATE_MIN_FOLLOWERS', 1000);

    if (dto.followerCount < minFollowers) {
      throw new ForbiddenException(`Minimum ${minFollowers} followers required to apply`);
    }

    // In a real implementation, you would store this application in a separate table
    // For now, we'll create a pending campaign that requires approval
    const campaign = this.campaignRepo.create({
      affiliateId: userId,
      name: `${dto.fullName}'s Affiliate Program`,
      description: dto.promotionStrategy,
      status: 'draft',
      commissionRate: dto.requestedCommissionRate || 25,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      metadata: {
        approvedBy: null,
        approvedAt: null,
        notes: dto.additionalInfo,
      },
    });

    return await this.campaignRepo.save(campaign);
  }

  async approveCampaign(campaignId: string, adminId: string): Promise<AffiliateCampaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    campaign.status = 'active';
    campaign.metadata = {
      ...campaign.metadata,
      approvedBy: adminId,
      approvedAt: new Date().toISOString(),
    };

    return await this.campaignRepo.save(campaign);
  }

  async rejectCampaign(campaignId: string, adminId: string, reason: string): Promise<AffiliateCampaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    campaign.status = 'rejected';
    campaign.metadata = {
      ...campaign.metadata,
      approvedBy: adminId,
      approvedAt: new Date().toISOString(),
      rejectionReason: reason,
    };

    return await this.campaignRepo.save(campaign);
  }

  async getAllCampaigns(status?: string): Promise<AffiliateCampaign[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return await this.campaignRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getAffiliateStats(affiliateId: string) {
    const campaigns = await this.getUserCampaigns(affiliateId);

    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
    const totalSignups = campaigns.reduce((sum, c) => sum + c.signups, 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
    const totalRevenue = campaigns.reduce((sum, c) => sum + Number(c.totalRevenue), 0);
    const totalCommission = campaigns.reduce((sum, c) => sum + Number(c.totalCommission), 0);

    return {
      overview: {
        activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
        totalCampaigns: campaigns.length,
        totalClicks,
        totalSignups,
        totalConversions,
        overallConversionRate: totalSignups > 0 ? (totalConversions / totalSignups) * 100 : 0,
        totalRevenue,
        totalCommission,
        averageCommissionPerCampaign: campaigns.length > 0 ? totalCommission / campaigns.length : 0,
      },
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        clicks: c.clicks,
        signups: c.signups,
        conversions: c.conversions,
        conversionRate: c.conversionRate,
        totalCommission: c.totalCommission,
      })),
    };
  }
}
