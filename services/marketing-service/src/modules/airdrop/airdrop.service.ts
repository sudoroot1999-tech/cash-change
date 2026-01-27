import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThan } from 'typeorm';
import { 
  AirdropCampaign, 
  AirdropStatus,
  AirdropType 
} from '../../entities/AirdropCampaign.entity';
import { 
  AirdropAllocation, 
  AllocationStatus 
} from '../../entities/AirdropAllocation.entity';

@Injectable()
export class AirdropService {
  constructor(
    @InjectRepository(AirdropCampaign)
    private campaignRepo: Repository<AirdropCampaign>,
    @InjectRepository(AirdropAllocation)
    private allocationRepo: Repository<AirdropAllocation>,
  ) {}

  // Campaign Management
  async createCampaign(data: Partial<AirdropCampaign>): Promise<AirdropCampaign> {
    const campaign = this.campaignRepo.create({
      ...data,
      status: AirdropStatus.DRAFT,
    });
    return this.campaignRepo.save(campaign);
  }

  async updateCampaign(id: string, data: Partial<AirdropCampaign>): Promise<AirdropCampaign> {
    await this.campaignRepo.update(id, data);
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  // Snapshot Tool
  async takeSnapshot(campaignId: string, userDataProvider: any): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.status !== AirdropStatus.SNAPSHOT_PENDING) {
      throw new BadRequestException('Campaign not ready for snapshot');
    }

    // Get eligible users based on criteria
    const eligibleUsers = await this.getEligibleUsers(campaign, userDataProvider);

    // Calculate allocations
    const allocations = await this.calculateAllocations(campaign, eligibleUsers);

    // Save allocations
    for (const allocation of allocations) {
      const existing = await this.allocationRepo.findOne({
        where: { campaignId, userId: allocation.userId }
      });

      if (!existing) {
        const newAllocation = this.allocationRepo.create({
          campaignId,
          userId: allocation.userId,
          allocatedAmount: allocation.amount,
          remainingAmount: allocation.amount,
          snapshotData: allocation.snapshotData,
          status: AllocationStatus.ELIGIBLE,
          eligibleAt: new Date(),
        });
        await this.allocationRepo.save(newAllocation);
      }
    }

    // Update campaign
    await this.campaignRepo.update(campaignId, {
      status: AirdropStatus.SNAPSHOT_COMPLETED,
      snapshotCompletedAt: new Date(),
      eligibleUsers: allocations.length,
    });
  }

  private async getEligibleUsers(campaign: AirdropCampaign, userDataProvider: any): Promise<any[]> {
    const criteria = campaign.eligibilityCriteria;
    const users: any[] = [];

    // This would integrate with your user service
    // For now, returning mock structure
    // In reality, you'd query your user database with these filters:
    // - minTokenBalance
    // - minTradeVolume
    // - minTrades
    // - registrationBefore
    // - kycRequired
    // - countries/excludeCountries
    // - minAccountAge

    // Example pseudo-code:
    // const eligibleUsers = await userService.find({
    //   where: {
    //     tokenBalance: MoreThan(criteria.minTokenBalance || 0),
    //     totalTradeVolume: MoreThan(criteria.minTradeVolume || 0),
    //     ...
    //   }
    // });

    return users;
  }

  private async calculateAllocations(
    campaign: AirdropCampaign,
    eligibleUsers: any[]
  ): Promise<any[]> {
    const formula = campaign.distributionFormula;
    const allocations: any[] = [];

    if (formula.type === 'equal') {
      // Equal distribution
      const amountPerUser = campaign.totalAllocation / eligibleUsers.length;
      
      for (const user of eligibleUsers) {
        allocations.push({
          userId: user.id,
          amount: amountPerUser,
          snapshotData: {
            tokenBalance: user.tokenBalance,
            tradeVolume: user.tradeVolume,
            tradesCount: user.tradesCount,
            accountAge: user.accountAge,
          },
        });
      }
    } else if (formula.type === 'proportional') {
      // Proportional based on weights
      const weights = formula.weights || {};
      const totalScore = eligibleUsers.reduce((sum, user) => {
        const score = this.calculateUserScore(user, weights);
        return sum + score;
      }, 0);

      for (const user of eligibleUsers) {
        const userScore = this.calculateUserScore(user, weights);
        const allocation = (userScore / totalScore) * campaign.totalAllocation;
        
        allocations.push({
          userId: user.id,
          amount: allocation,
          snapshotData: {
            tokenBalance: user.tokenBalance,
            tradeVolume: user.tradeVolume,
            tradesCount: user.tradesCount,
            accountAge: user.accountAge,
            score: userScore,
          },
        });
      }
    } else if (formula.type === 'tiered') {
      // Tiered allocation
      for (const user of eligibleUsers) {
        const tier = this.determineUserTier(user, formula.tiers || []);
        if (tier) {
          allocations.push({
            userId: user.id,
            amount: tier.allocation,
            snapshotData: {
              tokenBalance: user.tokenBalance,
              tradeVolume: user.tradeVolume,
              tier: tier.minValue,
            },
          });
        }
      }
    }

    // Apply min/max constraints
    return allocations.map(alloc => ({
      ...alloc,
      amount: Math.max(
        campaign.minClaimAmount || 0,
        Math.min(alloc.amount, campaign.maxClaimAmount || Infinity)
      ),
    }));
  }

  private calculateUserScore(user: any, weights: any): number {
    let score = 0;
    if (weights.tokenBalance) score += user.tokenBalance * weights.tokenBalance;
    if (weights.tradeVolume) score += user.tradeVolume * weights.tradeVolume;
    if (weights.accountAge) score += user.accountAge * weights.accountAge;
    if (weights.referrals) score += user.referrals * weights.referrals;
    return score;
  }

  private determineUserTier(user: any, tiers: any[]): any {
    for (const tier of tiers) {
      const value = user.tradeVolume || user.tokenBalance || 0;
      if (value >= tier.minValue && value <= tier.maxValue) {
        return tier;
      }
    }
    return null;
  }

  // Claim Management
  async openClaiming(campaignId: string): Promise<AirdropCampaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.status !== AirdropStatus.SNAPSHOT_COMPLETED) {
      throw new BadRequestException('Snapshot must be completed first');
    }

    await this.campaignRepo.update(campaignId, {
      status: AirdropStatus.CLAIMING_OPEN,
    });

    return this.campaignRepo.findOne({ where: { id: campaignId } });
  }

  async claimAirdrop(
    campaignId: string,
    userId: string,
    walletAddress: string,
    ipAddress: string,
    deviceFingerprint: string
  ): Promise<AirdropAllocation> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.status !== AirdropStatus.CLAIMING_OPEN) {
      throw new BadRequestException('Claiming is not open');
    }

    // Check claim window
    const now = new Date();
    if (now < campaign.claimStartDate || now > campaign.claimEndDate) {
      throw new BadRequestException('Outside claim window');
    }

    const allocation = await this.allocationRepo.findOne({
      where: { campaignId, userId }
    });

    if (!allocation) {
      throw new NotFoundException('No allocation found for user');
    }

    if (allocation.status === AllocationStatus.CLAIMED) {
      throw new BadRequestException('Airdrop already claimed');
    }

    if (allocation.status !== AllocationStatus.ELIGIBLE) {
      throw new BadRequestException('User not eligible to claim');
    }

    // Anti-Sybil checks
    const fraudScore = await this.performAntiSybilChecks(
      campaign,
      ipAddress,
      deviceFingerprint,
      walletAddress
    );

    if (fraudScore > campaign.antiSybilMeasures.fraudScoreThreshold) {
      await this.allocationRepo.update(allocation.id, {
        status: AllocationStatus.REJECTED,
        isSuspicious: true,
        fraudScore,
        rejectionReason: 'Failed anti-Sybil checks',
      });
      throw new BadRequestException('Claim rejected: suspicious activity detected');
    }

    // Update allocation
    const updateData: Partial<AirdropAllocation> = {
      status: campaign.hasVesting ? AllocationStatus.VESTING : AllocationStatus.CLAIMED,
      claimedAt: new Date(),
      walletAddress,
      ipAddress,
      deviceFingerprint,
      fraudScore,
    };

    if (campaign.hasVesting) {
      // Setup vesting schedule
      updateData.vestingReleases = this.createVestingSchedule(
        campaign,
        allocation.allocatedAmount
      );
      updateData.nextVestingDate = updateData.vestingReleases[0]?.releaseDate;
    } else {
      updateData.claimedAmount = allocation.allocatedAmount;
      updateData.remainingAmount = 0;
    }

    await this.allocationRepo.update(allocation.id, updateData);

    // Update campaign stats
    await this.campaignRepo.increment(
      { id: campaignId },
      'claimedUsers',
      1
    );
    await this.campaignRepo.increment(
      { id: campaignId },
      'totalClaimed',
      Number(allocation.allocatedAmount)
    );

    return this.allocationRepo.findOne({ where: { id: allocation.id } });
  }

  private async performAntiSybilChecks(
    campaign: AirdropCampaign,
    ipAddress: string,
    deviceFingerprint: string,
    walletAddress: string
  ): Promise<number> {
    const measures = campaign.antiSybilMeasures;
    let fraudScore = 0;

    // Check IP duplicates
    if (measures.maxPerIp) {
      const ipCount = await this.allocationRepo.count({
        where: {
          campaignId: campaign.id,
          ipAddress,
          status: In([AllocationStatus.CLAIMED, AllocationStatus.VESTING]),
        },
      });
      if (ipCount >= measures.maxPerIp) fraudScore += 40;
    }

    // Check device duplicates
    if (measures.maxPerDevice) {
      const deviceCount = await this.allocationRepo.count({
        where: {
          campaignId: campaign.id,
          deviceFingerprint,
          status: In([AllocationStatus.CLAIMED, AllocationStatus.VESTING]),
        },
      });
      if (deviceCount >= measures.maxPerDevice) fraudScore += 40;
    }

    // Check wallet uniqueness
    if (measures.requireUniqueWallet) {
      const walletCount = await this.allocationRepo.count({
        where: {
          campaignId: campaign.id,
          walletAddress,
          status: In([AllocationStatus.CLAIMED, AllocationStatus.VESTING]),
        },
      });
      if (walletCount > 0) fraudScore += 50;
    }

    return fraudScore;
  }

  private createVestingSchedule(
    campaign: AirdropCampaign,
    totalAmount: number
  ): any[] {
    if (!campaign.vestingSchedule) return [];

    const schedule = campaign.vestingSchedule;
    const releases: any[] = [];
    const claimDate = new Date();

    if (schedule.releaseSchedule) {
      for (const release of schedule.releaseSchedule) {
        const releaseDate = new Date(claimDate);
        releaseDate.setDate(releaseDate.getDate() + release.daysFromStart);
        
        releases.push({
          releaseDate,
          amount: (totalAmount * release.percentage) / 100,
          released: false,
        });
      }
    }

    return releases.sort((a, b) => a.releaseDate.getTime() - b.releaseDate.getTime());
  }

  // Vesting Release
  async processVestingReleases(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign || !campaign.hasVesting) return;

    const now = new Date();
    const allocations = await this.allocationRepo.find({
      where: {
        campaignId,
        status: AllocationStatus.VESTING,
        nextVestingDate: LessThan(now),
      },
    });

    for (const allocation of allocations) {
      const releases = allocation.vestingReleases || [];
      let totalReleased = 0;

      for (let i = 0; i < releases.length; i++) {
        const release = releases[i];
        if (!release.released && new Date(release.releaseDate) <= now) {
          // Mark as released and process distribution
          releases[i].released = true;
          releases[i].transactionHash = await this.distributeTokens(
            allocation.walletAddress,
            release.amount,
            campaign.tokenSymbol
          );
          totalReleased += release.amount;
        }
      }

      // Find next vesting date
      const nextRelease = releases.find(r => !r.released);
      const updateData: Partial<AirdropAllocation> = {
        vestingReleases: releases,
        vestedAmount: Number(allocation.vestedAmount) + totalReleased,
        claimedAmount: Number(allocation.claimedAmount) + totalReleased,
        remainingAmount: Number(allocation.remainingAmount) - totalReleased,
        nextVestingDate: nextRelease?.releaseDate || null,
      };

      // Check if fully vested
      if (!nextRelease) {
        updateData.status = AllocationStatus.DISTRIBUTED;
        updateData.fullyVestedAt = new Date();
      }

      await this.allocationRepo.update(allocation.id, updateData);

      // Update campaign stats
      await this.campaignRepo.increment(
        { id: campaignId },
        'totalDistributed',
        totalReleased
      );
    }
  }

  private async distributeTokens(
    walletAddress: string,
    amount: number,
    tokenSymbol: string
  ): Promise<string> {
    // This would integrate with your blockchain/wallet service
    // Return transaction hash
    return 'mock-tx-hash-' + Date.now();
  }

  // Auto Distribution
  async autoDistribute(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (!campaign.autoDistribute) {
      throw new BadRequestException('Auto-distribute not enabled');
    }

    const allocations = await this.allocationRepo.find({
      where: {
        campaignId,
        status: AllocationStatus.ELIGIBLE,
      },
    });

    for (const allocation of allocations) {
      // Automatically distribute without claim
      const txHash = await this.distributeTokens(
        allocation.walletAddress,
        Number(allocation.allocatedAmount),
        campaign.tokenSymbol
      );

      await this.allocationRepo.update(allocation.id, {
        status: AllocationStatus.DISTRIBUTED,
        claimedAmount: allocation.allocatedAmount,
        remainingAmount: 0,
        claimTransactionHash: txHash,
        claimedAt: new Date(),
      });

      await this.campaignRepo.increment(
        { id: campaignId },
        'totalDistributed',
        Number(allocation.allocatedAmount)
      );
      await this.campaignRepo.increment(
        { id: campaignId },
        'claimedUsers',
        1
      );
    }
  }

  // Analytics
  async getAirdropAnalytics(campaignId: string): Promise<any> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const allocations = await this.allocationRepo.find({ where: { campaignId } });

    const claimed = allocations.filter(a => 
      a.status === AllocationStatus.CLAIMED || 
      a.status === AllocationStatus.DISTRIBUTED ||
      a.status === AllocationStatus.VESTING
    );

    const rejected = allocations.filter(a => a.status === AllocationStatus.REJECTED);
    const pending = allocations.filter(a => a.status === AllocationStatus.ELIGIBLE);

    return {
      campaign,
      totalEligible: allocations.length,
      totalClaimed: claimed.length,
      totalRejected: rejected.length,
      totalPending: pending.length,
      claimRate: allocations.length > 0 ? (claimed.length / allocations.length) * 100 : 0,
      totalAllocated: campaign.totalAllocation,
      totalDistributed: campaign.totalDistributed,
      remainingAllocation: Number(campaign.totalAllocation) - Number(campaign.totalClaimed),
      averageAllocation: allocations.length > 0 
        ? allocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0) / allocations.length
        : 0,
    };
  }

  async getUserAllocation(campaignId: string, userId: string): Promise<AirdropAllocation | null> {
    return this.allocationRepo.findOne({
      where: { campaignId, userId },
      relations: ['campaign'],
    });
  }
}
