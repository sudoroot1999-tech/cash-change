import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformStaking, StakingStatus } from '../entities/staking.entity';

@Injectable()
export class StakingService {
  constructor(
    @InjectRepository(PlatformStaking)
    private readonly stakingRepository: Repository<PlatformStaking>,
  ) {}

  async stake(userId: string, amount: string): Promise<PlatformStaking> {
    // Check if user already has active staking
    const existingStaking = await this.stakingRepository.findOne({
      where: { userId, status: StakingStatus.ACTIVE },
    });

    if (existingStaking) {
      // Add to existing stake
      const newAmount = (BigInt(existingStaking.amount) + BigInt(amount)).toString();
      existingStaking.amount = newAmount;
      existingStaking.tier = this.calculateTier(newAmount);
      existingStaking.allocationMultiplier = this.getTierMultiplier(existingStaking.tier).toString();
      return this.stakingRepository.save(existingStaking);
    }

    // Create new staking
    const tier = this.calculateTier(amount);
    const staking = this.stakingRepository.create({
      userId,
      amount,
      status: StakingStatus.ACTIVE,
      tier,
      allocationMultiplier: this.getTierMultiplier(tier).toString(),
      stakedAt: new Date(),
      lockupDays: 7,
    });

    return this.stakingRepository.save(staking);
  }

  async requestUnstake(userId: string, stakingId: string): Promise<PlatformStaking> {
    const staking = await this.stakingRepository.findOne({
      where: { id: stakingId, userId },
    });

    if (!staking) {
      throw new NotFoundException('Staking not found');
    }

    if (staking.status !== StakingStatus.ACTIVE) {
      throw new BadRequestException('Staking is not active');
    }

    staking.status = StakingStatus.UNSTAKING;
    staking.unstakeRequestedAt = new Date();
    staking.unstakeAvailableAt = new Date(
      Date.now() + staking.lockupDays * 24 * 60 * 60 * 1000,
    );

    return this.stakingRepository.save(staking);
  }

  async completeUnstake(userId: string, stakingId: string): Promise<PlatformStaking> {
    const staking = await this.stakingRepository.findOne({
      where: { id: stakingId, userId },
    });

    if (!staking) {
      throw new NotFoundException('Staking not found');
    }

    if (staking.status !== StakingStatus.UNSTAKING) {
      throw new BadRequestException('Staking is not in unstaking status');
    }

    if (staking.unstakeAvailableAt && new Date() < staking.unstakeAvailableAt) {
      throw new BadRequestException('Unstaking period not yet completed');
    }

    staking.status = StakingStatus.COMPLETED;
    staking.unstakedAt = new Date();

    return this.stakingRepository.save(staking);
  }

  async getUserStaking(userId: string): Promise<PlatformStaking | null> {
    return this.stakingRepository.findOne({
      where: { userId, status: StakingStatus.ACTIVE },
    });
  }

  async getUserStakingHistory(userId: string): Promise<PlatformStaking[]> {
    return this.stakingRepository.find({
      where: { userId },
      order: { stakedAt: 'DESC' },
    });
  }

  async checkStakingRequirement(
    userId: string,
    minAmount: string,
    minDays: number,
  ): Promise<boolean> {
    const staking = await this.getUserStaking(userId);

    if (!staking) {
      return false;
    }

    // Check amount
    if (BigInt(staking.amount) < BigInt(minAmount)) {
      return false;
    }

    // Check duration
    const stakingDays = Math.floor(
      (Date.now() - staking.stakedAt.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (stakingDays < minDays) {
      return false;
    }

    return true;
  }

  async getUserTier(userId: string): Promise<number> {
    const staking = await this.getUserStaking(userId);
    return staking?.tier || 1;
  }

  async incrementParticipation(userId: string): Promise<void> {
    const staking = await this.getUserStaking(userId);
    if (staking) {
      await this.stakingRepository.update(staking.id, {
        participationCount: () => 'participation_count + 1',
      });
    }
  }

  async addRewards(userId: string, rewardAmount: string): Promise<void> {
    const staking = await this.getUserStaking(userId);
    if (staking) {
      const newRewards = (BigInt(staking.rewardsEarned) + BigInt(rewardAmount)).toString();
      await this.stakingRepository.update(staking.id, {
        rewardsEarned: newRewards,
      });
    }
  }

  private calculateTier(amount: string): number {
    const amountNum = parseFloat(amount);
    
    // Example tier thresholds (adjust based on your token)
    if (amountNum >= 100000) return 5;
    if (amountNum >= 50000) return 4;
    if (amountNum >= 10000) return 3;
    if (amountNum >= 1000) return 2;
    return 1;
  }

  private getTierMultiplier(tier: number): number {
    const multipliers = {
      1: 1,
      2: 1.5,
      3: 2,
      4: 3,
      5: 5,
    };

    return multipliers[tier] || 1;
  }

  async getStats(): Promise<any> {
    const [total, active, unstaking] = await Promise.all([
      this.stakingRepository.count(),
      this.stakingRepository.count({ where: { status: StakingStatus.ACTIVE } }),
      this.stakingRepository.count({ where: { status: StakingStatus.UNSTAKING } }),
    ]);

    const totalStakedResult = await this.stakingRepository
      .createQueryBuilder('staking')
      .select('SUM(CAST(staking.amount AS DECIMAL))', 'totalStaked')
      .where('staking.status = :status', { status: StakingStatus.ACTIVE })
      .getRawOne();

    const tierDistribution = await this.stakingRepository
      .createQueryBuilder('staking')
      .select('staking.tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .where('staking.status = :status', { status: StakingStatus.ACTIVE })
      .groupBy('staking.tier')
      .getRawMany();

    return {
      total,
      active,
      unstaking,
      totalStaked: totalStakedResult?.totalStaked || 0,
      tierDistribution,
    };
  }
}
