import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { nanoid } from 'nanoid';
import { 
  ReferralCampaign, 
  ReferralCampaignStatus,
  CommissionType 
} from '../../entities/ReferralCampaign.entity';
import { ReferralLink } from '../../entities/ReferralLink.entity';
import { Referral, ReferralStatus } from '../../entities/Referral.entity';
import { 
  ReferralCommission, 
  CommissionStatus,
  CommissionTrigger 
} from '../../entities/ReferralCommission.entity';

@Injectable()
export class ReferralService {
  constructor(
    @InjectRepository(ReferralCampaign)
    private campaignRepo: Repository<ReferralCampaign>,
    @InjectRepository(ReferralLink)
    private linkRepo: Repository<ReferralLink>,
    @InjectRepository(Referral)
    private referralRepo: Repository<Referral>,
    @InjectRepository(ReferralCommission)
    private commissionRepo: Repository<ReferralCommission>,
  ) {}

  // Campaign Management
  async createCampaign(data: Partial<ReferralCampaign>): Promise<ReferralCampaign> {
    const campaign = this.campaignRepo.create(data);
    return this.campaignRepo.save(campaign);
  }

  async updateCampaign(id: string, data: Partial<ReferralCampaign>): Promise<ReferralCampaign> {
    await this.campaignRepo.update(id, data);
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async activateCampaign(id: string): Promise<ReferralCampaign> {
    return this.updateCampaign(id, { status: ReferralCampaignStatus.ACTIVE });
  }

  async pauseCampaign(id: string): Promise<ReferralCampaign> {
    return this.updateCampaign(id, { status: ReferralCampaignStatus.PAUSED });
  }

  async endCampaign(id: string): Promise<ReferralCampaign> {
    return this.updateCampaign(id, { status: ReferralCampaignStatus.ENDED });
  }

  // Referral Link Generation
  async generateReferralLink(
    userId: string,
    campaignId: string,
    customCode?: string,
    utmParams?: any
  ): Promise<ReferralLink> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    // Check if user already has a link for this campaign
    const existing = await this.linkRepo.findOne({ where: { userId, campaignId } });
    if (existing) return existing;

    // Generate unique codes
    let referralCode: string;
    if (customCode && campaign.allowCustomCodes) {
      // Validate custom code
      const codeExists = await this.linkRepo.findOne({ where: { referralCode: customCode } });
      if (codeExists) throw new BadRequestException('Referral code already taken');
      referralCode = customCode;
    } else {
      referralCode = await this.generateUniqueCode();
    }

    const shortCode = nanoid(8);
    const baseUrl = process.env.APP_URL || 'https://exchange.com';
    
    // Build UTM parameters
    const utmString = utmParams ? this.buildUtmString(utmParams) : '';
    const fullUrl = `${baseUrl}/register?ref=${referralCode}${utmString}`;

    const link = this.linkRepo.create({
      userId,
      campaignId,
      referralCode,
      shortCode,
      fullUrl,
      utmParameters: utmParams || {},
      isActive: true,
    });

    return this.linkRepo.save(link);
  }

  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    do {
      code = nanoid(10).toUpperCase();
      const exists = await this.linkRepo.findOne({ where: { referralCode: code } });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);
    
    if (attempts >= 10) throw new Error('Failed to generate unique code');
    return code;
  }

  private buildUtmString(params: any): string {
    const parts: string[] = [];
    if (params.source) parts.push(`utm_source=${encodeURIComponent(params.source)}`);
    if (params.medium) parts.push(`utm_medium=${encodeURIComponent(params.medium)}`);
    if (params.campaign) parts.push(`utm_campaign=${encodeURIComponent(params.campaign)}`);
    if (params.term) parts.push(`utm_term=${encodeURIComponent(params.term)}`);
    if (params.content) parts.push(`utm_content=${encodeURIComponent(params.content)}`);
    return parts.length > 0 ? `&${parts.join('&')}` : '';
  }

  // Track Referral Click
  async trackClick(referralCode: string, ipAddress: string, userAgent: string): Promise<void> {
    const link = await this.linkRepo.findOne({ where: { referralCode, isActive: true } });
    if (!link) return;

    await this.linkRepo.update(link.id, {
      clicks: link.clicks + 1,
      lastClickAt: new Date(),
    });
  }

  // Create Referral
  async createReferral(
    referralCode: string,
    referredUserId: string,
    clickData: any
  ): Promise<Referral> {
    const link = await this.linkRepo.findOne({ 
      where: { referralCode, isActive: true },
      relations: ['campaign']
    });
    
    if (!link) throw new NotFoundException('Invalid referral code');

    // Check if campaign is active
    if (link.campaign.status !== ReferralCampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign is not active');
    }

    // Check if user already used this code
    const existingReferral = await this.referralRepo.findOne({
      where: { referredUserId }
    });
    if (existingReferral) {
      throw new BadRequestException('User already has a referrer');
    }

    // Fraud check
    const fraudChecks = await this.performFraudChecks(clickData);

    const referral = this.referralRepo.create({
      referrerId: link.userId,
      referredUserId,
      referralLinkId: link.id,
      referralCode,
      status: ReferralStatus.PENDING,
      ipAddress: clickData.ipAddress,
      userAgent: clickData.userAgent,
      clickData,
      registeredAt: new Date(),
      fraudChecks,
    });

    const saved = await this.referralRepo.save(referral);

    // Update link stats
    await this.linkRepo.update(link.id, {
      conversions: link.conversions + 1,
      conversionRate: ((link.conversions + 1) / link.clicks) * 100,
      activeReferrals: link.activeReferrals + 1,
      lastConversionAt: new Date(),
    });

    return saved;
  }

  private async performFraudChecks(clickData: any): Promise<any> {
    const checks: any = {
      ipDuplicate: false,
      deviceDuplicate: false,
      rapidSignup: false,
      suspiciousActivity: false,
      fraudScore: 0,
    };

    // Check for IP duplicates
    const ipCount = await this.referralRepo.count({
      where: { ipAddress: clickData.ipAddress }
    });
    if (ipCount > 2) {
      checks.ipDuplicate = true;
      checks.fraudScore += 30;
    }

    // Check for rapid signups
    const recentSignups = await this.referralRepo.count({
      where: {
        ipAddress: clickData.ipAddress,
        registeredAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000))
      }
    });
    if (recentSignups > 3) {
      checks.rapidSignup = true;
      checks.fraudScore += 40;
    }

    return checks;
  }

  // Qualify Referral
  async qualifyReferral(referralId: string): Promise<Referral> {
    const referral = await this.referralRepo.findOne({ 
      where: { id: referralId },
      relations: ['referralLink', 'referralLink.campaign']
    });
    
    if (!referral) throw new NotFoundException('Referral not found');

    // Check qualification criteria
    const campaign = referral.referralLink.campaign;
    const criteria = campaign.eligibilityCriteria;

    // This would be checked with actual user data
    // For now, we'll just mark as qualified
    await this.referralRepo.update(referralId, {
      status: ReferralStatus.QUALIFIED,
      qualificationMet: true,
      qualifiedAt: new Date(),
    });

    // Generate commission
    await this.generateCommission(referral, CommissionTrigger.REGISTRATION);

    return this.referralRepo.findOne({ where: { id: referralId } });
  }

  // Multi-tier Commission Calculation
  private async calculateCommission(
    campaign: ReferralCampaign,
    baseAmount: number,
    tier: number = 1
  ): Promise<number> {
    if (campaign.commissionType === CommissionType.FIXED) {
      return campaign.defaultCommissionRate;
    }

    if (campaign.commissionType === CommissionType.TIERED && campaign.commissionStructure) {
      const tierKey = `tier${tier}` as keyof typeof campaign.commissionStructure;
      const tierConfig = campaign.commissionStructure[tierKey];
      
      if (tierConfig?.percentage) {
        return (baseAmount * tierConfig.percentage) / 100;
      }
      if (tierConfig?.fixed) {
        return tierConfig.fixed;
      }
    }

    // Default percentage
    return (baseAmount * campaign.defaultCommissionRate) / 100;
  }

  // Generate Commission
  async generateCommission(
    referral: Referral,
    trigger: CommissionTrigger,
    baseAmount: number = 0
  ): Promise<ReferralCommission> {
    const link = await this.linkRepo.findOne({
      where: { id: referral.referralLinkId },
      relations: ['campaign']
    });

    const campaign = link.campaign;
    const commissionAmount = await this.calculateCommission(campaign, baseAmount, referral.tier);

    // Check max commission limits
    if (campaign.maxCommissionPerUser) {
      const userTotal = await this.commissionRepo
        .createQueryBuilder('c')
        .where('c.userId = :userId', { userId: referral.referrerId })
        .andWhere('c.status = :status', { status: CommissionStatus.APPROVED })
        .select('SUM(c.amount)', 'total')
        .getRawOne();

      if (userTotal.total >= campaign.maxCommissionPerUser) {
        throw new BadRequestException('User has reached max commission limit');
      }
    }

    const commission = this.commissionRepo.create({
      referralId: referral.id,
      userId: referral.referrerId,
      referredUserId: referral.referredUserId,
      trigger,
      amount: commissionAmount,
      currency: 'USD',
      commissionRate: campaign.defaultCommissionRate,
      baseAmount,
      tier: referral.tier,
      status: CommissionStatus.PENDING,
    });

    const saved = await this.commissionRepo.save(commission);

    // Update link earnings
    await this.linkRepo.update(link.id, {
      pendingEarnings: link.pendingEarnings + commissionAmount,
      totalEarnings: link.totalEarnings + commissionAmount,
    });

    return saved;
  }

  // Approve Commission
  async approveCommission(commissionId: string, approvedBy: string): Promise<ReferralCommission> {
    const commission = await this.commissionRepo.findOne({ where: { id: commissionId } });
    if (!commission) throw new NotFoundException('Commission not found');

    await this.commissionRepo.update(commissionId, {
      status: CommissionStatus.APPROVED,
      approvedAt: new Date(),
      approvedBy,
    });

    return this.commissionRepo.findOne({ where: { id: commissionId } });
  }

  // Pay Commission
  async payCommission(
    commissionId: string, 
    payoutDetails: any
  ): Promise<ReferralCommission> {
    const commission = await this.commissionRepo.findOne({ 
      where: { id: commissionId },
      relations: ['referral', 'referral.referralLink']
    });
    
    if (!commission) throw new NotFoundException('Commission not found');
    if (commission.status !== CommissionStatus.APPROVED) {
      throw new BadRequestException('Commission not approved');
    }

    await this.commissionRepo.update(commissionId, {
      status: CommissionStatus.PAID,
      paidAt: new Date(),
      payoutDetails,
    });

    // Update link stats
    const link = commission.referral.referralLink;
    await this.linkRepo.update(link.id, {
      paidEarnings: link.paidEarnings + commission.amount,
      pendingEarnings: link.pendingEarnings - commission.amount,
    });

    return this.commissionRepo.findOne({ where: { id: commissionId } });
  }

  // Get Leaderboard
  async getLeaderboard(
    campaignId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<any[]> {
    const query = this.linkRepo
      .createQueryBuilder('link')
      .select('link.userId', 'userId')
      .addSelect('SUM(link.totalEarnings)', 'totalEarnings')
      .addSelect('SUM(link.activeReferrals)', 'totalReferrals')
      .addSelect('SUM(link.conversions)', 'totalConversions')
      .groupBy('link.userId')
      .orderBy('totalEarnings', 'DESC')
      .limit(limit);

    if (campaignId) {
      query.where('link.campaignId = :campaignId', { campaignId });
    }

    if (startDate && endDate) {
      query.andWhere('link.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });
    }

    return query.getRawMany();
  }

  // Get Referral Analytics
  async getReferralAnalytics(userId: string, campaignId?: string): Promise<any> {
    const query = this.linkRepo
      .createQueryBuilder('link')
      .where('link.userId = :userId', { userId });

    if (campaignId) {
      query.andWhere('link.campaignId = :campaignId', { campaignId });
    }

    const links = await query.getMany();

    const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
    const totalConversions = links.reduce((sum, link) => sum + link.conversions, 0);
    const totalEarnings = links.reduce((sum, link) => sum + Number(link.totalEarnings), 0);
    const pendingEarnings = links.reduce((sum, link) => sum + Number(link.pendingEarnings), 0);
    const paidEarnings = links.reduce((sum, link) => sum + Number(link.paidEarnings), 0);

    return {
      totalLinks: links.length,
      totalClicks,
      totalConversions,
      conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      totalEarnings,
      pendingEarnings,
      paidEarnings,
      activeReferrals: links.reduce((sum, link) => sum + link.activeReferrals, 0),
      links,
    };
  }

  // Get Campaign Performance
  async getCampaignPerformance(campaignId: string): Promise<any> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const links = await this.linkRepo.find({ where: { campaignId } });
    const referrals = await this.referralRepo
      .createQueryBuilder('ref')
      .innerJoin('ref.referralLink', 'link')
      .where('link.campaignId = :campaignId', { campaignId })
      .getMany();

    const commissions = await this.commissionRepo
      .createQueryBuilder('comm')
      .innerJoin('comm.referral', 'ref')
      .innerJoin('ref.referralLink', 'link')
      .where('link.campaignId = :campaignId', { campaignId })
      .getMany();

    const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
    const totalConversions = links.reduce((sum, link) => sum + link.conversions, 0);
    const totalCommissionPaid = commissions
      .filter(c => c.status === CommissionStatus.PAID)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    return {
      campaign,
      totalParticipants: links.length,
      totalClicks,
      totalConversions,
      conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      totalReferrals: referrals.length,
      qualifiedReferrals: referrals.filter(r => r.status === ReferralStatus.QUALIFIED).length,
      totalCommissionPaid,
      pendingCommissions: commissions.filter(c => c.status === CommissionStatus.PENDING).length,
      averageEarningsPerParticipant: links.length > 0 ? totalCommissionPaid / links.length : 0,
    };
  }
}
