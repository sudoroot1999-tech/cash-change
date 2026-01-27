import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserLevel } from '../entities/user-level.entity';
import { XpTransaction, XpSource } from '../entities/xp-transaction.entity';
import { RewardService } from './reward.service';
import { FraudDetectionService } from './fraud-detection.service';

@Injectable()
export class LevelService {
  private readonly logger = new Logger(LevelService.name);
  private readonly maxLevel: number;
  private readonly baseXpRequirement: number;
  private readonly xpMultiplier: number;

  constructor(
    @InjectRepository(UserLevel)
    private readonly userLevelRepository: Repository<UserLevel>,
    @InjectRepository(XpTransaction)
    private readonly xpTransactionRepository: Repository<XpTransaction>,
    private readonly rewardService: RewardService,
    private readonly fraudDetectionService: FraudDetectionService,
    private readonly configService: ConfigService,
  ) {
    this.maxLevel = this.configService.get<number>('MAX_LEVEL', 100);
    this.baseXpRequirement = this.configService.get<number>('BASE_XP_REQUIREMENT', 100);
    this.xpMultiplier = this.configService.get<number>('XP_MULTIPLIER', 1.5);
  }

  async getUserLevel(userId: string): Promise<UserLevel> {
    let userLevel = await this.userLevelRepository.findOne({
      where: { userId },
    });

    if (!userLevel) {
      userLevel = await this.initializeUserLevel(userId);
    }

    return userLevel;
  }

  async addXp(
    userId: string,
    amount: number,
    source: XpSource,
    sourceId?: string,
    description?: string,
    metadata?: Record<string, any>,
  ): Promise<{ userLevel: UserLevel; leveledUp: boolean; newLevel?: number }> {
    // Fraud detection
    const isSuspicious = await this.fraudDetectionService.checkXpGain(userId, amount, source);
    if (isSuspicious) {
      this.logger.warn(`Suspicious XP gain detected for user ${userId}`);
      // Continue but flag for review
    }

    // Get or create user level
    let userLevel = await this.getUserLevel(userId);

    // Record XP transaction
    const transaction = this.xpTransactionRepository.create({
      userId,
      amount,
      source,
      sourceId,
      description,
      metadata,
    });
    await this.xpTransactionRepository.save(transaction);

    // Update XP
    userLevel.currentXp += amount;
    userLevel.totalXp += amount;
    userLevel.lifetimeXp += amount;

    let leveledUp = false;
    let newLevel = userLevel.level;

    // Check for level up
    while (userLevel.currentXp >= userLevel.nextLevelXp && userLevel.level < this.maxLevel) {
      leveledUp = true;
      userLevel.level += 1;
      newLevel = userLevel.level;
      userLevel.currentXp -= userLevel.nextLevelXp;
      userLevel.nextLevelXp = this.calculateNextLevelXp(userLevel.level);

      this.logger.log(`User ${userId} leveled up to level ${userLevel.level}`);

      // Grant level-up rewards
      await this.grantLevelUpRewards(userId, userLevel.level);
    }

    await this.userLevelRepository.save(userLevel);

    return { userLevel, leveledUp, newLevel: leveledUp ? newLevel : undefined };
  }

  async getXpTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<XpTransaction[]> {
    return this.xpTransactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getLeaderboard(limit: number = 100): Promise<UserLevel[]> {
    return this.userLevelRepository.find({
      order: {
        level: 'DESC',
        totalXp: 'DESC',
      },
      take: limit,
    });
  }

  private async initializeUserLevel(userId: string): Promise<UserLevel> {
    const userLevel = this.userLevelRepository.create({
      userId,
      level: 1,
      currentXp: 0,
      totalXp: 0,
      nextLevelXp: this.baseXpRequirement,
      lifetimeXp: 0,
    });

    return this.userLevelRepository.save(userLevel);
  }

  private calculateNextLevelXp(level: number): number {
    return Math.floor(this.baseXpRequirement * Math.pow(this.xpMultiplier, level - 1));
  }

  private async grantLevelUpRewards(userId: string, level: number): Promise<void> {
    // Token rewards based on level
    const tokenReward = this.calculateLevelTokenReward(level);
    
    await this.rewardService.createReward({
      userId,
      type: 'TOKEN',
      title: `Level ${level} Reward`,
      description: `Congratulations on reaching level ${level}!`,
      amount: tokenReward,
      sourceType: 'level_up',
      sourceId: level.toString(),
    });

    // Special rewards at milestone levels
    if (level % 10 === 0) {
      await this.rewardService.createReward({
        userId,
        type: 'FEE_DISCOUNT',
        title: `Level ${level} Fee Discount`,
        description: `Enjoy reduced trading fees for reaching level ${level}!`,
        amount: this.calculateFeeDiscountPercentage(level),
        sourceType: 'level_milestone',
        sourceId: level.toString(),
        metadata: { duration_days: 30 },
      });
    }

    // Exclusive features at specific levels
    if (level === 25) {
      await this.rewardService.createReward({
        userId,
        type: 'PRIORITY_SUPPORT',
        title: 'Priority Support Access',
        description: 'Unlock priority customer support!',
        sourceType: 'level_milestone',
        sourceId: level.toString(),
      });
    }

    if (level === 50) {
      await this.rewardService.createReward({
        userId,
        type: 'EARLY_ACCESS',
        title: 'Early Access Features',
        description: 'Get early access to new platform features!',
        sourceType: 'level_milestone',
        sourceId: level.toString(),
      });
    }
  }

  private calculateLevelTokenReward(level: number): number {
    const baseReward = this.configService.get<number>('LEVEL_UP_TOKEN_REWARD', 10);
    return baseReward * Math.floor(level / 5 + 1);
  }

  private calculateFeeDiscountPercentage(level: number): number {
    // 0.5% discount per 10 levels, max 5%
    return Math.min(5, (level / 10) * 0.5);
  }
}
