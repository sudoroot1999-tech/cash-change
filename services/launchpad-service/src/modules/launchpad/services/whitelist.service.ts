import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Whitelist, WhitelistStatus } from '../entities/whitelist.entity';
import { WhitelistApplicationDto } from '../dto/participate.dto';
import { SaleRoundService } from './sale-round.service';

@Injectable()
export class WhitelistService {
  constructor(
    @InjectRepository(Whitelist)
    private readonly whitelistRepository: Repository<Whitelist>,
    private readonly saleRoundService: SaleRoundService,
  ) {}

  async apply(
    applicationDto: WhitelistApplicationDto,
    userId: string,
    metadata?: any,
  ): Promise<Whitelist> {
    const { saleRoundId, walletAddress, referralCode, applicationAnswers } = applicationDto;

    // Get sale round
    const saleRound = await this.saleRoundService.findOne(saleRoundId);

    // Check if whitelist is open
    const now = new Date();
    if (now < saleRound.whitelistStartTime || now > saleRound.whitelistEndTime) {
      throw new BadRequestException('Whitelist application is not currently open');
    }

    // Check if already applied
    const existing = await this.whitelistRepository.findOne({
      where: { userId, saleRoundId },
    });

    if (existing) {
      throw new BadRequestException('You have already applied for this whitelist');
    }

    // Create whitelist entry
    const whitelist = this.whitelistRepository.create({
      userId,
      saleRoundId,
      projectId: saleRound.projectId,
      walletAddress,
      status: WhitelistStatus.PENDING,
      userTier: 1, // Default tier, will be updated based on staking
      isEligible: true,
      metadata: {
        ...metadata,
        referralCode,
        applicationAnswers,
      },
    });

    const saved = await this.whitelistRepository.save(whitelist);

    // Increment whitelist count
    await this.saleRoundService.incrementWhitelistCount(saleRoundId);

    return saved;
  }

  async approve(whitelistId: string, adminId: string): Promise<Whitelist> {
    const whitelist = await this.whitelistRepository.findOne({
      where: { id: whitelistId },
    });

    if (!whitelist) {
      throw new NotFoundException('Whitelist entry not found');
    }

    if (whitelist.status !== WhitelistStatus.PENDING) {
      throw new BadRequestException('Whitelist entry is not in pending status');
    }

    whitelist.status = WhitelistStatus.APPROVED;
    whitelist.approvedAt = new Date();
    whitelist.approvedBy = adminId;

    return this.whitelistRepository.save(whitelist);
  }

  async reject(whitelistId: string, adminId: string, reason: string): Promise<Whitelist> {
    const whitelist = await this.whitelistRepository.findOne({
      where: { id: whitelistId },
    });

    if (!whitelist) {
      throw new NotFoundException('Whitelist entry not found');
    }

    whitelist.status = WhitelistStatus.REJECTED;
    whitelist.approvedBy = adminId;
    whitelist.isEligible = false;
    whitelist.ineligibilityReason = reason;

    return this.whitelistRepository.save(whitelist);
  }

  async bulkApprove(whitelistIds: string[], adminId: string): Promise<void> {
    await this.whitelistRepository.update(
      { id: whitelistIds as any },
      {
        status: WhitelistStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: adminId,
      },
    );
  }

  async autoApprove(saleRoundId: string): Promise<number> {
    const result = await this.whitelistRepository.update(
      {
        saleRoundId,
        status: WhitelistStatus.PENDING,
        isEligible: true,
        kycCompleted: true,
      },
      {
        status: WhitelistStatus.APPROVED,
        approvedAt: new Date(),
      },
    );

    return result.affected || 0;
  }

  async updateKycStatus(userId: string, saleRoundId: string, completed: boolean): Promise<Whitelist> {
    const whitelist = await this.whitelistRepository.findOne({
      where: { userId, saleRoundId },
    });

    if (!whitelist) {
      throw new NotFoundException('Whitelist entry not found');
    }

    whitelist.kycCompleted = completed;
    whitelist.kycCompletedAt = completed ? new Date() : undefined;

    return this.whitelistRepository.save(whitelist);
  }

  async updateStakingInfo(
    userId: string,
    saleRoundId: string,
    stakingAmount: string,
    tier: number,
  ): Promise<Whitelist> {
    const whitelist = await this.whitelistRepository.findOne({
      where: { userId, saleRoundId },
    });

    if (!whitelist) {
      throw new NotFoundException('Whitelist entry not found');
    }

    whitelist.stakingRequirementMet = true;
    whitelist.stakingAmount = stakingAmount;
    whitelist.userTier = tier;

    // Calculate max allocation based on tier
    const saleRound = await this.saleRoundService.findOne(saleRoundId);
    const baseAllocation = parseFloat(saleRound.maxAllocation);
    const tierMultiplier = this.getTierMultiplier(saleRound, tier);
    whitelist.maxAllocation = (baseAllocation * tierMultiplier).toString();

    return this.whitelistRepository.save(whitelist);
  }

  private getTierMultiplier(saleRound: any, tier: number): number {
    if (!saleRound.tierMultipliers) {
      return 1;
    }

    const key = `tier${tier}` as keyof typeof saleRound.tierMultipliers;
    return saleRound.tierMultipliers[key] || 1;
  }

  async findByUserAndRound(userId: string, saleRoundId: string): Promise<Whitelist | null> {
    return this.whitelistRepository.findOne({
      where: { userId, saleRoundId },
    });
  }

  async findByUser(userId: string): Promise<Whitelist[]> {
    return this.whitelistRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByRound(saleRoundId: string, status?: WhitelistStatus): Promise<Whitelist[]> {
    const where: any = { saleRoundId };
    if (status) {
      where.status = status;
    }

    return this.whitelistRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }

  async getStats(saleRoundId?: string): Promise<any> {
    const queryBuilder = this.whitelistRepository.createQueryBuilder('whitelist');

    if (saleRoundId) {
      queryBuilder.where('whitelist.saleRoundId = :saleRoundId', { saleRoundId });
    }

    const [total, pending, approved, rejected, kycCompleted] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('whitelist.status = :status', { status: WhitelistStatus.PENDING }).getCount(),
      queryBuilder.clone().andWhere('whitelist.status = :status', { status: WhitelistStatus.APPROVED }).getCount(),
      queryBuilder.clone().andWhere('whitelist.status = :status', { status: WhitelistStatus.REJECTED }).getCount(),
      queryBuilder.clone().andWhere('whitelist.kycCompleted = :kycCompleted', { kycCompleted: true }).getCount(),
    ]);

    return {
      total,
      byStatus: {
        pending,
        approved,
        rejected,
      },
      kycCompleted,
    };
  }

  async checkEligibility(
    userId: string,
    saleRoundId: string,
    country: string,
  ): Promise<{ eligible: boolean; reason?: string }> {
    // Check if user is from restricted country
    const restrictedCountries = ['US', 'CN', 'KP']; // Example restricted countries
    if (restrictedCountries.includes(country)) {
      return {
        eligible: false,
        reason: 'Your country is not eligible for this sale',
      };
    }

    // Check if already whitelisted
    const existing = await this.findByUserAndRound(userId, saleRoundId);
    if (existing) {
      return {
        eligible: false,
        reason: 'You have already applied for this whitelist',
      };
    }

    return { eligible: true };
  }
}
