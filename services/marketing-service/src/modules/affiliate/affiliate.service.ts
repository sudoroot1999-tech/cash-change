import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { nanoid } from 'nanoid';
import { 
  AffiliateProgram, 
  AffiliateProgramStatus 
} from '../../entities/AffiliateProgram.entity';
import { 
  Affiliate, 
  AffiliateStatus 
} from '../../entities/Affiliate.entity';

@Injectable()
export class AffiliateService {
  constructor(
    @InjectRepository(AffiliateProgram)
    private programRepo: Repository<AffiliateProgram>,
    @InjectRepository(Affiliate)
    private affiliateRepo: Repository<Affiliate>,
  ) {}

  // Program Management
  async createProgram(data: Partial<AffiliateProgram>): Promise<AffiliateProgram> {
    const program = this.programRepo.create(data);
    return this.programRepo.save(program);
  }

  async updateProgram(id: string, data: Partial<AffiliateProgram>): Promise<AffiliateProgram> {
    await this.programRepo.update(id, data);
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  async getProgram(id: string): Promise<AffiliateProgram> {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) throw new NotFoundException('Program not found');
    return program;
  }

  async getActivePrograms(): Promise<AffiliateProgram[]> {
    return this.programRepo.find({ 
      where: { status: AffiliateProgramStatus.ACTIVE }
    });
  }

  // Affiliate Registration
  async registerAffiliate(
    userId: string,
    programId: string,
    applicationData: {
      companyName?: string;
      website?: string;
      description?: string;
      socialMedia?: any;
      estimatedMonthlyTraffic?: number;
      trafficSources?: any;
    }
  ): Promise<Affiliate> {
    const program = await this.programRepo.findOne({ where: { id: programId } });
    if (!program) throw new NotFoundException('Program not found');

    if (program.status !== AffiliateProgramStatus.ACTIVE) {
      throw new BadRequestException('Program is not active');
    }

    // Check if user is already an affiliate
    const existing = await this.affiliateRepo.findOne({ where: { userId } });
    if (existing) {
      throw new BadRequestException('User is already registered as affiliate');
    }

    // Generate unique affiliate code
    const affiliateCode = await this.generateUniqueCode();

    const affiliate = this.affiliateRepo.create({
      userId,
      programId,
      affiliateCode,
      status: program.requirements.requiresApproval 
        ? AffiliateStatus.PENDING 
        : AffiliateStatus.APPROVED,
      currentCommissionRate: program.defaultCommissionRate,
      ...applicationData,
    });

    const saved = await this.affiliateRepo.save(affiliate);

    // Auto-approve if not required
    if (!program.requirements.requiresApproval) {
      await this.approveAffiliate(saved.id, 'system');
    }

    return saved;
  }

  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    do {
      code = nanoid(8).toUpperCase();
      const exists = await this.affiliateRepo.findOne({ 
        where: { affiliateCode: code } 
      });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);
    
    if (attempts >= 10) throw new Error('Failed to generate unique code');
    return code;
  }

  // Affiliate Approval
  async approveAffiliate(
    affiliateId: string,
    approvedBy: string
  ): Promise<Affiliate> {
    const affiliate = await this.affiliateRepo.findOne({ where: { id: affiliateId } });
    if (!affiliate) throw new NotFoundException('Affiliate not found');

    await this.affiliateRepo.update(affiliateId, {
      status: AffiliateStatus.ACTIVE,
      approvedAt: new Date(),
      approvedBy,
    });

    // Generate API key if needed
    const apiKey = this.generateApiKey();
    await this.affiliateRepo.update(affiliateId, { 
      hasApiAccess: true,
      apiKey 
    });

    // Update program stats
    await this.programRepo.increment({ id: affiliate.programId }, 'totalAffiliates', 1);
    await this.programRepo.increment({ id: affiliate.programId }, 'activeAffiliates', 1);

    return this.affiliateRepo.findOne({ where: { id: affiliateId } });
  }

  async rejectAffiliate(
    affiliateId: string,
    reason: string
  ): Promise<Affiliate> {
    await this.affiliateRepo.update(affiliateId, {
      status: AffiliateStatus.TERMINATED,
      notes: reason,
    });

    return this.affiliateRepo.findOne({ where: { id: affiliateId } });
  }

  async suspendAffiliate(affiliateId: string, reason: string): Promise<Affiliate> {
    await this.affiliateRepo.update(affiliateId, {
      status: AffiliateStatus.SUSPENDED,
      notes: reason,
    });

    const affiliate = await this.affiliateRepo.findOne({ where: { id: affiliateId } });
    await this.programRepo.decrement({ id: affiliate.programId }, 'activeAffiliates', 1);

    return affiliate;
  }

  async reactivateAffiliate(affiliateId: string): Promise<Affiliate> {
    await this.affiliateRepo.update(affiliateId, {
      status: AffiliateStatus.ACTIVE,
    });

    const affiliate = await this.affiliateRepo.findOne({ where: { id: affiliateId } });
    await this.programRepo.increment({ id: affiliate.programId }, 'activeAffiliates', 1);

    return affiliate;
  }

  private generateApiKey(): string {
    return `aff_${nanoid(32)}`;
  }

  // Tracking
  async trackClick(affiliateCode: string): Promise<void> {
    const affiliate = await this.affiliateRepo.findOne({ 
      where: { affiliateCode, status: AffiliateStatus.ACTIVE }
    });
    
    if (affiliate) {
      await this.affiliateRepo.increment({ id: affiliate.id }, 'totalClicks', 1);
    }
  }

  async trackConversion(
    affiliateCode: string,
    userId: string,
    revenue: number
  ): Promise<void> {
    const affiliate = await this.affiliateRepo.findOne({ 
      where: { affiliateCode, status: AffiliateStatus.ACTIVE },
      relations: ['program']
    });

    if (!affiliate) return;

    // Calculate commission
    const commission = this.calculateCommission(affiliate, revenue);

    // Update affiliate stats
    await this.affiliateRepo.increment({ id: affiliate.id }, 'totalConversions', 1);
    await this.affiliateRepo.update(affiliate.id, {
      totalRevenue: Number(affiliate.totalRevenue) + revenue,
      totalEarnings: Number(affiliate.totalEarnings) + commission,
      pendingEarnings: Number(affiliate.pendingEarnings) + commission,
      conversionRate: ((affiliate.totalConversions + 1) / affiliate.totalClicks) * 100,
      currentMonthRevenue: Number(affiliate.currentMonthRevenue) + revenue,
    });

    // Update program stats
    await this.programRepo.increment({ id: affiliate.programId }, 'totalConversions', 1);
    await this.programRepo.update(affiliate.programId, {
      totalRevenue: Number(affiliate.program.totalRevenue) + revenue,
    });

    // Check for tier upgrade
    await this.checkTierUpgrade(affiliate.id);
  }

  private calculateCommission(affiliate: Affiliate, revenue: number): number {
    const program = affiliate.program;
    
    // Check tier-based commission
    if (program.commissionTiers?.length) {
      for (const tier of program.commissionTiers) {
        if (Number(affiliate.currentMonthRevenue) >= tier.minMonthlyVolume) {
          return (revenue * tier.commissionRate) / 100;
        }
      }
    }

    // Default commission
    return (revenue * affiliate.currentCommissionRate) / 100;
  }

  private async checkTierUpgrade(affiliateId: string): Promise<void> {
    const affiliate = await this.affiliateRepo.findOne({ 
      where: { id: affiliateId },
      relations: ['program']
    });

    if (!affiliate || !affiliate.program.commissionTiers) return;

    const tiers = affiliate.program.commissionTiers;
    const monthlyRevenue = Number(affiliate.currentMonthRevenue);

    // Find highest eligible tier
    let newTier = tiers[0];
    for (const tier of tiers) {
      if (monthlyRevenue >= tier.minMonthlyVolume) {
        newTier = tier;
      }
    }

    // Update if tier changed
    if (newTier.name !== affiliate.currentTier) {
      await this.affiliateRepo.update(affiliateId, {
        currentTier: newTier.name,
        currentCommissionRate: newTier.commissionRate,
      });
    }
  }

  // Payouts
  async processPayout(
    affiliateId: string,
    amount: number,
    payoutDetails: any
  ): Promise<void> {
    const affiliate = await this.affiliateRepo.findOne({ where: { id: affiliateId } });
    if (!affiliate) throw new NotFoundException('Affiliate not found');

    if (Number(affiliate.pendingEarnings) < amount) {
      throw new BadRequestException('Insufficient pending earnings');
    }

    const program = await this.programRepo.findOne({ 
      where: { id: affiliate.programId } 
    });

    if (amount < Number(program.minimumPayout)) {
      throw new BadRequestException(`Minimum payout is ${program.minimumPayout}`);
    }

    // Process payout (integrate with payment service)
    // ...

    // Update affiliate stats
    await this.affiliateRepo.update(affiliateId, {
      pendingEarnings: Number(affiliate.pendingEarnings) - amount,
      paidEarnings: Number(affiliate.paidEarnings) + amount,
      lastPayoutAt: new Date(),
      payoutDetails,
    });

    // Update program stats
    await this.programRepo.update(affiliate.programId, {
      totalCommissionsPaid: Number(program.totalCommissionsPaid) + amount,
    });
  }

  async getPayoutSchedule(affiliateId: string): Promise<any> {
    const affiliate = await this.affiliateRepo.findOne({ 
      where: { id: affiliateId },
      relations: ['program']
    });

    if (!affiliate) throw new NotFoundException('Affiliate not found');

    const program = affiliate.program;
    const lastPayout = affiliate.lastPayoutAt || new Date();
    
    let nextPayoutDate: Date;
    switch (program.payoutFrequency) {
      case 'weekly':
        nextPayoutDate = new Date(lastPayout.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'biweekly':
        nextPayoutDate = new Date(lastPayout.getTime() + 14 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
      default:
        nextPayoutDate = new Date(lastPayout);
        nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
        break;
    }

    return {
      nextPayoutDate,
      pendingAmount: affiliate.pendingEarnings,
      minimumPayout: program.minimumPayout,
      canPayout: Number(affiliate.pendingEarnings) >= Number(program.minimumPayout),
    };
  }

  // Landing Pages
  async createLandingPage(
    affiliateId: string,
    name: string,
    url: string
  ): Promise<Affiliate> {
    const affiliate = await this.affiliateRepo.findOne({ where: { id: affiliateId } });
    if (!affiliate) throw new NotFoundException('Affiliate not found');

    const landingPages = affiliate.landingPages || [];
    landingPages.push({
      id: nanoid(8),
      name,
      url,
      isActive: true,
    });

    await this.affiliateRepo.update(affiliateId, { landingPages });
    return this.affiliateRepo.findOne({ where: { id: affiliateId } });
  }

  async updateLandingPage(
    affiliateId: string,
    landingPageId: string,
    updates: any
  ): Promise<Affiliate> {
    const affiliate = await this.affiliateRepo.findOne({ where: { id: affiliateId } });
    if (!affiliate) throw new NotFoundException('Affiliate not found');

    const landingPages = affiliate.landingPages || [];
    const index = landingPages.findIndex(lp => lp.id === landingPageId);
    
    if (index === -1) {
      throw new NotFoundException('Landing page not found');
    }

    landingPages[index] = { ...landingPages[index], ...updates };
    
    await this.affiliateRepo.update(affiliateId, { landingPages });
    return this.affiliateRepo.findOne({ where: { id: affiliateId } });
  }

  // Analytics
  async getAffiliateAnalytics(affiliateId: string): Promise<any> {
    const affiliate = await this.affiliateRepo.findOne({ 
      where: { id: affiliateId },
      relations: ['program']
    });

    if (!affiliate) throw new NotFoundException('Affiliate not found');

    return {
      affiliate,
      performance: {
        totalClicks: affiliate.totalClicks,
        totalConversions: affiliate.totalConversions,
        conversionRate: affiliate.conversionRate,
        totalRevenue: affiliate.totalRevenue,
        totalEarnings: affiliate.totalEarnings,
        pendingEarnings: affiliate.pendingEarnings,
        paidEarnings: affiliate.paidEarnings,
      },
      currentMonth: {
        revenue: affiliate.currentMonthRevenue,
        tier: affiliate.currentTier,
        commissionRate: affiliate.currentCommissionRate,
      },
      lastMonth: {
        revenue: affiliate.lastMonthRevenue,
      },
    };
  }

  async getProgramAnalytics(programId: string): Promise<any> {
    const program = await this.programRepo.findOne({ where: { id: programId } });
    if (!program) throw new NotFoundException('Program not found');

    const affiliates = await this.affiliateRepo.find({ where: { programId } });

    const topPerformers = affiliates
      .sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue))
      .slice(0, 10);

    return {
      program,
      overview: {
        totalAffiliates: program.totalAffiliates,
        activeAffiliates: program.activeAffiliates,
        totalRevenue: program.totalRevenue,
        totalCommissionsPaid: program.totalCommissionsPaid,
        totalConversions: program.totalConversions,
        averageCommissionPerAffiliate: program.activeAffiliates > 0
          ? Number(program.totalCommissionsPaid) / program.activeAffiliates
          : 0,
      },
      topPerformers: topPerformers.map(a => ({
        affiliateId: a.id,
        affiliateCode: a.affiliateCode,
        totalRevenue: a.totalRevenue,
        totalEarnings: a.totalEarnings,
        conversions: a.totalConversions,
      })),
    };
  }

  // API Access
  async regenerateApiKey(affiliateId: string): Promise<string> {
    const newApiKey = this.generateApiKey();
    await this.affiliateRepo.update(affiliateId, { apiKey: newApiKey });
    return newApiKey;
  }

  async validateApiKey(apiKey: string): Promise<Affiliate | null> {
    return this.affiliateRepo.findOne({ 
      where: { apiKey, status: AffiliateStatus.ACTIVE }
    });
  }

  // Monthly Reset
  async resetMonthlyStats(): Promise<void> {
    const affiliates = await this.affiliateRepo.find();

    for (const affiliate of affiliates) {
      await this.affiliateRepo.update(affiliate.id, {
        lastMonthRevenue: affiliate.currentMonthRevenue,
        currentMonthRevenue: 0,
      });
    }
  }
}
