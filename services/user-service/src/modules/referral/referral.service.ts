import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import ShortUniqueId from 'short-unique-id';
import {
  ReferralCode,
  ReferralRelationship,
  ReferralCommission,
  ReferralAnalytics,
} from './entities';
import { CreateReferralCodeDto, UseReferralCodeDto, TradeCommissionDto } from './dto';
import { NotFoundError } from '@exchange/common';

@Injectable()
export class ReferralService {
  private readonly uid;

  constructor(
    @InjectRepository(ReferralCode)
    private readonly referralCodeRepo: Repository<ReferralCode>,
    @InjectRepository(ReferralRelationship)
    private readonly relationshipRepo: Repository<ReferralRelationship>,
    @InjectRepository(ReferralCommission)
    private readonly commissionRepo: Repository<ReferralCommission>,
    @InjectRepository(ReferralAnalytics)
    private readonly analyticsRepo: Repository<ReferralAnalytics>,
    private readonly configService: ConfigService,
  ) {
    const codeLength = this.configService.get('REFERRAL_CODE_LENGTH', 8);
    this.uid = new ShortUniqueId({ length: codeLength });
  }

  /**
   * Generate a unique referral code
   */
  async createReferralCode(userId: string, dto: CreateReferralCodeDto): Promise<ReferralCode> {
    // Check if user already has an active code
    const existingCode = await this.referralCodeRepo.findOne({
      where: { userId, isActive: true },
    });

    if (existingCode) {
      throw new ConflictException('User already has an active referral code');
    }

    // Generate unique code
    let code = dto.code;
    if (!code) {
      const prefix = this.configService.get('REFERRAL_CODE_PREFIX', 'REF');
      code = `${prefix}${this.uid()}`;
    }

    // Check if code is already taken
    const codeExists = await this.referralCodeRepo.findOne({ where: { code } });
    if (codeExists) {
      throw new ConflictException('Referral code already exists');
    }

    // Determine commission rate
    let commissionRate = dto.commissionRate;
    if (!commissionRate) {
      const type = dto.type || 'standard';
      commissionRate = this.getDefaultCommissionRate(type);
    }

    const referralCode = this.referralCodeRepo.create({
      code,
      userId,
      type: dto.type || 'standard',
      commissionRate,
      maxUsageLimit: dto.maxUsageLimit,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      metadata: {},
    });

    return await this.referralCodeRepo.save(referralCode);
  }

  async getUserReferralCode(userId: string): Promise<ReferralCode> {
    let code = await this.referralCodeRepo.findOne({
      where: { userId, isActive: true },
    });

    if (!code) {
      // Auto-create referral code for user
      code = await this.createReferralCode(userId, {});
    }

    return code;
  }

  async useReferralCode(refereeId: string, dto: UseReferralCodeDto): Promise<ReferralRelationship> {
    // Validate referral code
    const referralCode = await this.referralCodeRepo.findOne({
      where: { code: dto.code, isActive: true },
    });

    if (!referralCode) {
      throw new NotFoundException('Invalid or inactive referral code');
    }

    // Check if code is expired
    if (referralCode.expiresAt && new Date() > referralCode.expiresAt) {
      throw new BadRequestException('Referral code has expired');
    }

    // Check usage limit
    if (referralCode.maxUsageLimit && referralCode.usageCount >= referralCode.maxUsageLimit) {
      throw new BadRequestException('Referral code usage limit reached');
    }

    // Prevent self-referral
    if (referralCode.userId === refereeId) {
      throw new BadRequestException('Cannot use your own referral code');
    }

    // Check if user already has a referrer
    const existingRelationship = await this.relationshipRepo.findOne({
      where: { refereeId },
    });

    if (existingRelationship) {
      throw new ConflictException('User already has a referrer');
    }

    // Create Tier 1 relationship
    const relationship = this.relationshipRepo.create({
      referrerId: referralCode.userId,
      refereeId,
      referralCodeId: referralCode.id,
      tier: 1,
      metadata: {
        ipAddress: dto.ipAddress,
        deviceFingerprint: dto.deviceFingerprint,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
      },
    });

    await this.relationshipRepo.save(relationship);

    // Update usage count
    referralCode.usageCount += 1;
    await this.referralCodeRepo.save(referralCode);

    // Create Tier 2 relationship if referrer has a referrer
    await this.createTier2Relationship(referralCode.userId, refereeId);

    // Process signup bonus
    await this.processSignupBonus(relationship);

    // Update analytics
    await this.updateAnalytics(referralCode.userId);

    return relationship;
  }

  async findReferralByCode(dto: UseReferralCodeDto) {
    const referralCode = await this.referralCodeRepo.findOne({
      where: { code: dto.code, isActive: true },
    });

    if (!referralCode) {
      throw new NotFoundError('no referral found')
    }

    return referralCode
  }

  private async createTier2Relationship(tier1ReferrerId: string, refereeId: string): Promise<void> {
    // Find if tier1 referrer was referred by someone
    const tier1Relationship = await this.relationshipRepo.findOne({
      where: { refereeId: tier1ReferrerId, tier: 1 },
    });

    if (tier1Relationship) {
      // Create tier 2 relationship
      const tier2Relationship = this.relationshipRepo.create({
        referrerId: tier1Relationship.referrerId,
        refereeId,
        referralCodeId: tier1Relationship.referralCodeId,
        tier: 2,
      });

      await this.relationshipRepo.save(tier2Relationship);
    }
  }

  async processTradeCommission(dto: TradeCommissionDto): Promise<void> {
    // Find all relationships for this user
    const relationships = await this.relationshipRepo.find({
      where: { refereeId: dto.userId, status: 'active' },
      relations: ['referralCode'],
    });

    if (relationships.length === 0) {
      return; // User has no referrer
    }

    for (const relationship of relationships) {
      // Calculate commission
      const commissionRate = this.getCommissionRateForTier(
        relationship.referralCode.commissionRate,
        relationship.tier,
      );

      const commissionAmount = (dto.tradingFee * commissionRate) / 100;

      // Create commission record
      const commission = this.commissionRepo.create({
        referrerId: relationship.referrerId,
        refereeId: dto.userId,
        relationshipId: relationship.id,
        tradeId: dto.tradeId,
        type: 'trading_fee',
        tier: relationship.tier,
        amount: commissionAmount,
        tradingFee: dto.tradingFee,
        commissionRate,
        status: 'approved',
        approvedAt: new Date(),
        metadata: {
          tradingPair: dto.tradingPair,
          orderType: dto.orderType,
        },
      });

      await this.commissionRepo.save(commission);

      // Update relationship stats
      relationship.totalCommissionEarned += commissionAmount;
      relationship.totalTradingVolume += dto.volume || 0;
      relationship.totalTrades += 1;

      if (!relationship.hasCompletedFirstTrade) {
        relationship.hasCompletedFirstTrade = true;
        relationship.firstTradeAt = new Date();
        await this.processFirstTradeBonus(relationship);
      }

      await this.relationshipRepo.save(relationship);

      // Update analytics
      await this.updateAnalytics(relationship.referrerId);
    }
  }

  private async processSignupBonus(relationship: ReferralRelationship): Promise<void> {
    const signupBonus = this.configService.get<number>('SIGNUP_BONUS', 0);

    if (signupBonus > 0 && !relationship.signupBonusPaid) {
      const commission = this.commissionRepo.create({
        referrerId: relationship.referrerId,
        refereeId: relationship.refereeId,
        relationshipId: relationship.id,
        type: 'signup_bonus',
        tier: relationship.tier,
        amount: signupBonus,
        status: 'approved',
        approvedAt: new Date(),
      });

      await this.commissionRepo.save(commission);

      relationship.signupBonusPaid = true;
      await this.relationshipRepo.save(relationship);
    }
  }

  private async processFirstTradeBonus(relationship: ReferralRelationship): Promise<void> {
    const firstTradeBonus = this.configService.get<number>('FIRST_TRADE_BONUS', 0);

    if (firstTradeBonus > 0 && !relationship.firstTradeBonusPaid) {
      const commission = this.commissionRepo.create({
        referrerId: relationship.referrerId,
        refereeId: relationship.refereeId,
        relationshipId: relationship.id,
        type: 'first_trade_bonus',
        tier: relationship.tier,
        amount: firstTradeBonus,
        status: 'approved',
        approvedAt: new Date(),
      });

      await this.commissionRepo.save(commission);

      relationship.firstTradeBonusPaid = true;
      await this.relationshipRepo.save(relationship);
    }
  }

  /**
   * Get referrals for a user
   */
  async getReferralStats(userId: string, startDate?: Date, endDate?: Date) {
    const where: any = { userId };

    if (startDate || endDate) {
      where.date = Between(startDate || new Date('2000-01-01'), endDate || new Date());
    }

    const analytics = await this.analyticsRepo.find({
      where,
      order: { date: 'DESC' },
      take: 90, // Last 90 days
    });

    // Get overall stats
    const relationships = await this.relationshipRepo.find({
      where: { referrerId: userId },
    });

    const commissions = await this.commissionRepo.find({
      where: { referrerId: userId },
    });

    const totalEarnings = commissions
      .filter((c) => c.status === 'approved' || c.status === 'paid')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const pendingEarnings = commissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const paidEarnings = commissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const tier1Count = relationships.filter((r) => r.tier === 1).length;
    const tier2Count = relationships.filter((r) => r.tier === 2).length;

    return {
      overview: {
        totalReferrals: relationships.length,
        tier1Referrals: tier1Count,
        tier2Referrals: tier2Count,
        activeReferrals: relationships.filter((r) => r.status === 'active').length,
        totalEarnings,
        pendingEarnings,
        paidEarnings,
        totalTrades: relationships.reduce((sum, r) => sum + r.totalTrades, 0),
        totalVolume: relationships.reduce((sum, r) => sum + Number(r.totalTradingVolume), 0),
      },
      timeline: analytics,
      recentReferrals: relationships.slice(0, 10),
      recentCommissions: commissions.slice(0, 20),
    };
  }

  async getLeaderboard(period: string = 'monthly', limit: number = 100, metric: string = 'earnings') {
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'daily':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'monthly':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date('2000-01-01');
    }

    const query = this.commissionRepo
      .createQueryBuilder('commission')
      .select('commission.referrerId', 'userId')
      .addSelect('SUM(commission.amount)', 'totalEarnings')
      .addSelect('COUNT(DISTINCT commission.refereeId)', 'totalReferrals')
      .where('commission.createdAt >= :startDate', { startDate })
      .andWhere('commission.status IN (:...statuses)', { statuses: ['approved', 'paid'] })
      .groupBy('commission.referrerId');

    if (metric === 'earnings') {
      query.orderBy('totalEarnings', 'DESC');
    } else if (metric === 'referrals') {
      query.orderBy('totalReferrals', 'DESC');
    }

    query.limit(limit);

    const leaderboard = await query.getRawMany();

    return leaderboard.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      totalEarnings: parseFloat(entry.totalEarnings),
      totalReferrals: parseInt(entry.totalReferrals),
    }));
  }

  async getUserEarnings(userId: string) {
    const commissions = await this.commissionRepo.find({
      where: { referrerId: userId },
      order: { createdAt: 'DESC' },
    });

    const approved = commissions.filter((c) => c.status === 'approved' && !c.payoutId);
    const pending = commissions.filter((c) => c.status === 'pending');
    const paid = commissions.filter((c) => c.status === 'paid');

    return {
      available: approved.reduce((sum, c) => sum + Number(c.amount), 0),
      pending: pending.reduce((sum, c) => sum + Number(c.amount), 0),
      paid: paid.reduce((sum, c) => sum + Number(c.amount), 0),
      commissions: {
        approved: approved.slice(0, 50),
        pending: pending.slice(0, 50),
        paid: paid.slice(0, 50),
      },
    };
  }

  private getDefaultCommissionRate(type: string): number {
    switch (type) {
      case 'vip':
        return this.configService.get<number>('VIP_COMMISSION_RATE', 30);
      case 'affiliate':
        return this.configService.get<number>('TIER1_COMMISSION_RATE', 20);
      default:
        return this.configService.get<number>('TIER1_COMMISSION_RATE', 20);
    }
  }

  private getCommissionRateForTier(baseRate: number, tier: number): number {
    if (tier === 1) {
      return baseRate;
    } else if (tier === 2) {
      const tier2Rate = this.configService.get<number>('TIER2_COMMISSION_RATE', 10);
      return tier2Rate;
    }
    return 0;
  }

  private async updateAnalytics(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await this.analyticsRepo.findOne({
      where: { userId, date: today },
    });

    if (!analytics) {
      analytics = this.analyticsRepo.create({
        userId,
        date: today,
      });
    }

    // Calculate stats
    const relationships = await this.relationshipRepo.find({
      where: { referrerId: userId },
    });

    const todayRelationships = relationships.filter(
      (r) => r.createdAt >= today,
    );

    const commissions = await this.commissionRepo.find({
      where: {
        referrerId: userId,
        createdAt: MoreThan(today),
      },
    });

    analytics.newReferrals = todayRelationships.length;
    analytics.totalReferrals = relationships.length;
    analytics.activeReferrals = relationships.filter((r) => r.status === 'active').length;
    analytics.dailyCommissions = commissions.reduce((sum, c) => sum + Number(c.amount), 0);
    analytics.totalCommissions = relationships.reduce((sum, r) => sum + Number(r.totalCommissionEarned), 0);
    analytics.tradingVolume = relationships.reduce((sum, r) => sum + Number(r.totalTradingVolume), 0);
    analytics.totalTrades = relationships.reduce((sum, r) => sum + r.totalTrades, 0);

    await this.analyticsRepo.save(analytics);
  }
}
