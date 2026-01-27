import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reward, RewardType, RewardStatus } from '../entities/reward.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CreateRewardInput {
  userId: string;
  type: string;
  title: string;
  description: string;
  amount?: number;
  sourceType: string;
  sourceId?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

@Injectable()
export class RewardService {
  private readonly logger = new Logger(RewardService.name);

  constructor(
    @InjectRepository(Reward)
    private readonly rewardRepository: Repository<Reward>,
  ) {}

  async createReward(input: CreateRewardInput): Promise<Reward> {
    const reward = this.rewardRepository.create({
      ...input,
      type: input.type as RewardType,
      status: RewardStatus.PENDING,
    });

    await this.rewardRepository.save(reward);
    
    this.logger.log(`Reward created for user ${input.userId}: ${input.title}`);
    
    // Auto-distribute certain types of rewards
    if (this.shouldAutoDistribute(input.type as RewardType)) {
      await this.distributeReward(reward.id);
    }

    return reward;
  }

  async getUserRewards(
    userId: string,
    status?: RewardStatus,
  ): Promise<Reward[]> {
    const where: any = { userId };
    
    if (status) {
      where.status = status;
    }

    return this.rewardRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getPendingRewards(userId: string): Promise<Reward[]> {
    return this.getUserRewards(userId, RewardStatus.PENDING);
  }

  async distributeReward(rewardId: string): Promise<Reward> {
    const reward = await this.rewardRepository.findOne({
      where: { id: rewardId },
    });

    if (!reward) {
      throw new Error('Reward not found');
    }

    if (reward.status !== RewardStatus.PENDING) {
      throw new Error('Reward already distributed');
    }

    // Here you would integrate with actual distribution systems
    // For tokens: integrate with blockchain/wallet service
    // For discounts: update user settings
    // For features: update user permissions

    reward.status = RewardStatus.DISTRIBUTED;
    reward.distributedAt = new Date();

    await this.rewardRepository.save(reward);
    
    this.logger.log(`Reward ${rewardId} distributed to user ${reward.userId}`);

    return reward;
  }

  async claimReward(userId: string, rewardId: string): Promise<Reward> {
    const reward = await this.rewardRepository.findOne({
      where: { id: rewardId, userId },
    });

    if (!reward) {
      throw new Error('Reward not found');
    }

    if (reward.status === RewardStatus.EXPIRED) {
      throw new Error('Reward has expired');
    }

    if (reward.status === RewardStatus.CLAIMED) {
      throw new Error('Reward already claimed');
    }

    reward.status = RewardStatus.CLAIMED;
    reward.claimedAt = new Date();

    await this.rewardRepository.save(reward);
    
    this.logger.log(`Reward ${rewardId} claimed by user ${userId}`);

    return reward;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireOldRewards(): Promise<void> {
    const now = new Date();

    await this.rewardRepository
      .createQueryBuilder()
      .update()
      .set({ status: RewardStatus.EXPIRED })
      .where('status = :status', { status: RewardStatus.PENDING })
      .andWhere('expiresAt IS NOT NULL')
      .andWhere('expiresAt < :now', { now })
      .execute();

    this.logger.log('Expired old rewards');
  }

  async getRewardStats(userId: string): Promise<any> {
    const rewards = await this.getUserRewards(userId);

    const stats = {
      total: rewards.length,
      pending: rewards.filter(r => r.status === RewardStatus.PENDING).length,
      claimed: rewards.filter(r => r.status === RewardStatus.CLAIMED).length,
      expired: rewards.filter(r => r.status === RewardStatus.EXPIRED).length,
      totalValue: rewards
        .filter(r => r.amount)
        .reduce((sum, r) => sum + Number(r.amount), 0),
      byType: {} as Record<string, number>,
    };

    rewards.forEach(reward => {
      stats.byType[reward.type] = (stats.byType[reward.type] || 0) + 1;
    });

    return stats;
  }

  private shouldAutoDistribute(type: RewardType): boolean {
    // Auto-distribute tokens and XP boosts
    return [RewardType.TOKEN, RewardType.XP_BOOST].includes(type);
  }
}
