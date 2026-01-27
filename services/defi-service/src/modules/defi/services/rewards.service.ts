import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RewardHistory, RewardType, RewardStatus } from '../entities/reward-history.entity';
import BigNumber from 'bignumber.js';

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(RewardHistory)
    private rewardHistoryRepo: Repository<RewardHistory>,
  ) {}

  async getRewardHistory(userId: string, rewardType?: RewardType): Promise<RewardHistory[]> {
    const where: any = { userId };
    
    if (rewardType) {
      where.rewardType = rewardType;
    }

    return await this.rewardHistoryRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getTotalRewards(userId: string): Promise<{
    totalStakingRewards: string;
    totalFarmingRewards: string;
    totalLendingRewards: string;
    totalRewards: string;
    totalValueUsd: string;
  }> {
    const rewards = await this.rewardHistoryRepo.find({
      where: { userId, status: RewardStatus.CLAIMED },
    });

    let totalStakingRewards = new BigNumber(0);
    let totalFarmingRewards = new BigNumber(0);
    let totalLendingRewards = new BigNumber(0);
    let totalValueUsd = new BigNumber(0);

    for (const reward of rewards) {
      const amount = new BigNumber(reward.amount);
      
      switch (reward.rewardType) {
        case RewardType.STAKING:
          totalStakingRewards = totalStakingRewards.plus(amount);
          break;
        case RewardType.FARMING:
          totalFarmingRewards = totalFarmingRewards.plus(amount);
          break;
        case RewardType.LENDING:
          totalLendingRewards = totalLendingRewards.plus(amount);
          break;
      }

      if (reward.valueUsd) {
        totalValueUsd = totalValueUsd.plus(reward.valueUsd);
      }
    }

    const totalRewards = totalStakingRewards.plus(totalFarmingRewards).plus(totalLendingRewards);

    return {
      totalStakingRewards: totalStakingRewards.toString(),
      totalFarmingRewards: totalFarmingRewards.toString(),
      totalLendingRewards: totalLendingRewards.toString(),
      totalRewards: totalRewards.toString(),
      totalValueUsd: totalValueUsd.toString(),
    };
  }

  async getPendingRewards(userId: string): Promise<{
    stakingPending: string;
    farmingPending: string;
    lendingPending: string;
    totalPending: string;
  }> {
    const rewards = await this.rewardHistoryRepo.find({
      where: { userId, status: RewardStatus.PENDING },
    });

    let stakingPending = new BigNumber(0);
    let farmingPending = new BigNumber(0);
    let lendingPending = new BigNumber(0);

    for (const reward of rewards) {
      const amount = new BigNumber(reward.amount);
      
      switch (reward.rewardType) {
        case RewardType.STAKING:
          stakingPending = stakingPending.plus(amount);
          break;
        case RewardType.FARMING:
          farmingPending = farmingPending.plus(amount);
          break;
        case RewardType.LENDING:
          lendingPending = lendingPending.plus(amount);
          break;
      }
    }

    const totalPending = stakingPending.plus(farmingPending).plus(lendingPending);

    return {
      stakingPending: stakingPending.toString(),
      farmingPending: farmingPending.toString(),
      lendingPending: lendingPending.toString(),
      totalPending: totalPending.toString(),
    };
  }

  async getRewardsByAsset(userId: string): Promise<Map<string, string>> {
    const rewards = await this.rewardHistoryRepo.find({
      where: { userId, status: RewardStatus.CLAIMED },
    });

    const rewardsByAsset = new Map<string, BigNumber>();

    for (const reward of rewards) {
      const asset = reward.rewardAsset;
      const amount = new BigNumber(reward.amount);
      
      if (rewardsByAsset.has(asset)) {
        const existingAmount = rewardsByAsset.get(asset);
        if (existingAmount) {
          rewardsByAsset.set(asset, existingAmount.plus(amount));
        }
      } else {
        rewardsByAsset.set(asset, amount);
      }
    }

    const result = new Map<string, string>();
    rewardsByAsset.forEach((value, key) => {
      result.set(key, value.toString());
    });

    return result;
  }
}
