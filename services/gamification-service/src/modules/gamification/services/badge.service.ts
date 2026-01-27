import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge, BadgeCategory, BadgeRarity } from '../entities/badge.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { LevelService } from './level.service';
import { RewardService } from './reward.service';
import { XpSource } from '../entities/xp-transaction.entity';

@Injectable()
export class BadgeService {
  private readonly logger = new Logger(BadgeService.name);

  constructor(
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
    @InjectRepository(UserBadge)
    private readonly userBadgeRepository: Repository<UserBadge>,
    private readonly rewardService: RewardService,
  ) {}

  async getAllBadges(): Promise<Badge[]> {
    return this.badgeRepository.find({
      where: { isActive: true },
      order: { rarity: 'DESC', category: 'ASC' },
    });
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    return this.userBadgeRepository.find({
      where: { userId },
      relations: ['badge'],
      order: { earnedAt: 'DESC' },
    });
  }

  async awardBadge(
    userId: string,
    badgeCode: string,
    metadata?: Record<string, any>,
  ): Promise<UserBadge | null> {
    const badge = await this.badgeRepository.findOne({
      where: { code: badgeCode, isActive: true },
    });

    if (!badge) {
      this.logger.warn(`Badge ${badgeCode} not found`);
      return null;
    }

    // Check if user already has this badge
    const existingBadge = await this.userBadgeRepository.findOne({
      where: { userId, badgeId: badge.id },
    });

    if (existingBadge) {
      this.logger.warn(`User ${userId} already has badge ${badgeCode}`);
      return null;
    }

    // Award badge
    const userBadge = this.userBadgeRepository.create({
      userId,
      badgeId: badge.id,
      earnedAt: new Date(),
      progress: 100,
      metadata,
    });

    await this.userBadgeRepository.save(userBadge);

    // Grant badge rewards
    if (badge.tokenReward > 0) {
      await this.rewardService.createReward({
        userId,
        type: 'TOKEN',
        title: `${badge.name} Badge Reward`,
        description: `Earned for achieving: ${badge.description}`,
        amount: badge.tokenReward,
        sourceType: 'badge',
        sourceId: badge.id,
      });
    }

    this.logger.log(`Badge ${badgeCode} awarded to user ${userId}`);
    
    return userBadge;
  }

  async checkAndAwardBadges(
    userId: string,
    eventType: string,
    eventData: Record<string, any>,
  ): Promise<UserBadge[]> {
    const awardedBadges: UserBadge[] = [];

    // Get all active badges
    const badges = await this.badgeRepository.find({
      where: { isActive: true },
    });

    for (const badge of badges) {
      if (await this.checkBadgeCriteria(badge, userId, eventType, eventData)) {
        const userBadge = await this.awardBadge(userId, badge.code, eventData);
        if (userBadge) {
          awardedBadges.push(userBadge);
        }
      }
    }

    return awardedBadges;
  }

  private async checkBadgeCriteria(
    badge: Badge,
    userId: string,
    eventType: string,
    eventData: Record<string, any>,
  ): Promise<boolean> {
    if (!badge.criteria) return false;

    const { criteriaType, value } = badge.criteria;

    switch (criteriaType) {
      case 'first_trade':
        return eventType === 'trade_completed' && eventData.isFirstTrade === true;

      case 'trading_volume':
        return eventType === 'trading_volume_milestone' && eventData.totalVolume >= value;

      case 'login_streak':
        return eventType === 'login_streak' && eventData.streakDays >= value;

      case 'referral_count':
        return eventType === 'referral_milestone' && eventData.referralCount >= value;

      case 'level_reached':
        return eventType === 'level_up' && eventData.level >= value;

      default:
        return false;
    }
  }

  async getBadgeProgress(userId: string, badgeCode: string): Promise<number> {
    const badge = await this.badgeRepository.findOne({
      where: { code: badgeCode },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    const userBadge = await this.userBadgeRepository.findOne({
      where: { userId, badgeId: badge.id },
    });

    if (userBadge) {
      return 100; // Already earned
    }

    // Calculate progress based on criteria
    // This would need to query relevant data sources
    return 0;
  }

  async initializeDefaultBadges(): Promise<void> {
    const defaultBadges = [
      {
        code: 'FIRST_TRADE',
        name: 'First Trade',
        description: 'Complete your first trade',
        rarity: BadgeRarity.COMMON,
        category: BadgeCategory.ACHIEVEMENT,
        xpReward: 50,
        tokenReward: 5,
        criteria: { criteriaType: 'first_trade' },
      },
      {
        code: 'VOLUME_1K',
        name: 'Trader Apprentice',
        description: 'Achieve $1,000 in trading volume',
        rarity: BadgeRarity.COMMON,
        category: BadgeCategory.MILESTONE,
        xpReward: 100,
        tokenReward: 10,
        criteria: { criteriaType: 'trading_volume', value: 1000 },
      },
      {
        code: 'VOLUME_10K',
        name: 'Trader Expert',
        description: 'Achieve $10,000 in trading volume',
        rarity: BadgeRarity.UNCOMMON,
        category: BadgeCategory.MILESTONE,
        xpReward: 250,
        tokenReward: 25,
        criteria: { criteriaType: 'trading_volume', value: 10000 },
      },
      {
        code: 'VOLUME_100K',
        name: 'Trader Master',
        description: 'Achieve $100,000 in trading volume',
        rarity: BadgeRarity.RARE,
        category: BadgeCategory.MILESTONE,
        xpReward: 500,
        tokenReward: 50,
        criteria: { criteriaType: 'trading_volume', value: 100000 },
      },
      {
        code: 'STREAK_7',
        name: 'Week Warrior',
        description: 'Login 7 days in a row',
        rarity: BadgeRarity.COMMON,
        category: BadgeCategory.STREAK,
        xpReward: 75,
        tokenReward: 7,
        criteria: { criteriaType: 'login_streak', value: 7 },
      },
      {
        code: 'STREAK_30',
        name: 'Monthly Master',
        description: 'Login 30 days in a row',
        rarity: BadgeRarity.UNCOMMON,
        category: BadgeCategory.STREAK,
        xpReward: 200,
        tokenReward: 20,
        criteria: { criteriaType: 'login_streak', value: 30 },
      },
      {
        code: 'STREAK_100',
        name: 'Dedication Legend',
        description: 'Login 100 days in a row',
        rarity: BadgeRarity.EPIC,
        category: BadgeCategory.STREAK,
        xpReward: 1000,
        tokenReward: 100,
        criteria: { criteriaType: 'login_streak', value: 100 },
      },
      {
        code: 'REFERRAL_5',
        name: 'Community Builder',
        description: 'Refer 5 friends',
        rarity: BadgeRarity.UNCOMMON,
        category: BadgeCategory.ACHIEVEMENT,
        xpReward: 150,
        tokenReward: 15,
        criteria: { criteriaType: 'referral_count', value: 5 },
      },
      {
        code: 'LEVEL_25',
        name: 'Rising Star',
        description: 'Reach level 25',
        rarity: BadgeRarity.RARE,
        category: BadgeCategory.MILESTONE,
        xpReward: 500,
        tokenReward: 50,
        criteria: { criteriaType: 'level_reached', value: 25 },
      },
      {
        code: 'LEVEL_50',
        name: 'Elite Trader',
        description: 'Reach level 50',
        rarity: BadgeRarity.EPIC,
        category: BadgeCategory.MILESTONE,
        xpReward: 1000,
        tokenReward: 100,
        criteria: { criteriaType: 'level_reached', value: 50 },
      },
      {
        code: 'LEVEL_100',
        name: 'Legendary Trader',
        description: 'Reach the maximum level',
        rarity: BadgeRarity.LEGENDARY,
        category: BadgeCategory.MILESTONE,
        xpReward: 5000,
        tokenReward: 500,
        criteria: { criteriaType: 'level_reached', value: 100 },
      },
    ];

    for (const badgeData of defaultBadges) {
      const exists = await this.badgeRepository.findOne({
        where: { code: badgeData.code },
      });

      if (!exists) {
        const badge = this.badgeRepository.create(badgeData);
        await this.badgeRepository.save(badge);
        this.logger.log(`Created badge: ${badgeData.code}`);
      }
    }
  }
}
