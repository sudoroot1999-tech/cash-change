import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { LoyaltyTier, TierLevel } from '../../entities/LoyaltyTier.entity';
import { UserLoyalty } from '../../entities/UserLoyalty.entity';
import { 
  LoyaltyTransaction, 
  PointsTransactionType,
  PointsSource 
} from '../../entities/LoyaltyTransaction.entity';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyTier)
    private tierRepo: Repository<LoyaltyTier>,
    @InjectRepository(UserLoyalty)
    private userLoyaltyRepo: Repository<UserLoyalty>,
    @InjectRepository(LoyaltyTransaction)
    private transactionRepo: Repository<LoyaltyTransaction>,
  ) {}

  // Tier Management
  async createOrUpdateTier(data: Partial<LoyaltyTier>): Promise<LoyaltyTier> {
    const existing = await this.tierRepo.findOne({ where: { level: data.level } });
    
    if (existing) {
      await this.tierRepo.update(existing.id, data);
      return this.tierRepo.findOne({ where: { id: existing.id } });
    }
    
    const tier = this.tierRepo.create(data);
    return this.tierRepo.save(tier);
  }

  async getTier(level: TierLevel): Promise<LoyaltyTier> {
    const tier = await this.tierRepo.findOne({ where: { level } });
    if (!tier) throw new NotFoundException('Tier not found');
    return tier;
  }

  async getAllTiers(): Promise<LoyaltyTier[]> {
    return this.tierRepo.find({ 
      where: { isActive: true },
      order: { order: 'ASC' }
    });
  }

  // User Loyalty Initialization
  async initializeUserLoyalty(userId: string, birthday?: Date): Promise<UserLoyalty> {
    const existing = await this.userLoyaltyRepo.findOne({ where: { userId } });
    if (existing) return existing;

    const bronzeTier = await this.tierRepo.findOne({ where: { level: TierLevel.BRONZE } });
    if (!bronzeTier) throw new Error('Bronze tier not configured');

    const userLoyalty = this.userLoyaltyRepo.create({
      userId,
      currentTier: TierLevel.BRONZE,
      currentTierId: bronzeTier.id,
      totalPoints: 0,
      availablePoints: 0,
      pointsMultiplier: bronzeTier.benefits.pointsMultiplier || 1,
      tradingFeeDiscount: bronzeTier.benefits.tradingFeeDiscount || 0,
      withdrawalFeeDiscount: bronzeTier.benefits.withdrawalFeeDiscount || 0,
      birthday,
      accountAnniversary: new Date(),
      tierHistory: [{
        tier: TierLevel.BRONZE,
        achievedAt: new Date(),
      }],
    });

    return this.userLoyaltyRepo.save(userLoyalty);
  }

  // Points Management
  async awardPoints(
    userId: string,
    points: number,
    source: PointsSource,
    referenceId?: string,
    referenceType?: string,
    description?: string,
    expiresInDays?: number
  ): Promise<LoyaltyTransaction> {
    const userLoyalty = await this.getUserLoyalty(userId);
    
    // Apply multiplier
    const finalPoints = Math.floor(points * userLoyalty.pointsMultiplier);
    
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const transaction = this.transactionRepo.create({
      userId,
      type: PointsTransactionType.EARNED,
      source,
      points: finalPoints,
      balanceAfter: userLoyalty.availablePoints + finalPoints,
      multiplier: userLoyalty.pointsMultiplier,
      description,
      referenceId,
      referenceType,
      expiresAt,
    });

    await this.transactionRepo.save(transaction);

    // Update user balance
    await this.userLoyaltyRepo.update(userId, {
      totalPoints: userLoyalty.totalPoints + finalPoints,
      availablePoints: userLoyalty.availablePoints + finalPoints,
    });

    // Check for tier upgrade
    await this.checkTierUpgrade(userId);

    return transaction;
  }

  async redeemPoints(
    userId: string,
    points: number,
    description: string,
    referenceId?: string
  ): Promise<LoyaltyTransaction> {
    const userLoyalty = await this.getUserLoyalty(userId);

    if (userLoyalty.availablePoints < points) {
      throw new BadRequestException('Insufficient points');
    }

    const transaction = this.transactionRepo.create({
      userId,
      type: PointsTransactionType.REDEEMED,
      source: PointsSource.REDEMPTION,
      points: -points,
      balanceAfter: userLoyalty.availablePoints - points,
      description,
      referenceId,
    });

    await this.transactionRepo.save(transaction);

    await this.userLoyaltyRepo.update(userId, {
      availablePoints: userLoyalty.availablePoints - points,
      redeemedPoints: userLoyalty.redeemedPoints + points,
    });

    return transaction;
  }

  async expirePoints(): Promise<void> {
    const expiredTransactions = await this.transactionRepo.find({
      where: {
        type: PointsTransactionType.EARNED,
        expiresAt: LessThan(new Date()),
        isExpired: false,
      },
    });

    for (const transaction of expiredTransactions) {
      const userLoyalty = await this.getUserLoyalty(transaction.userId);

      // Create expiration transaction
      const expirationTx = this.transactionRepo.create({
        userId: transaction.userId,
        type: PointsTransactionType.EXPIRED,
        source: transaction.source,
        points: -transaction.points,
        balanceAfter: userLoyalty.availablePoints - transaction.points,
        description: `Points expired from ${transaction.source}`,
        referenceId: transaction.id,
      });

      await this.transactionRepo.save(expirationTx);

      // Update user balance
      await this.userLoyaltyRepo.update(transaction.userId, {
        availablePoints: userLoyalty.availablePoints - transaction.points,
        expiredPoints: userLoyalty.expiredPoints + transaction.points,
      });

      // Mark original transaction as expired
      await this.transactionRepo.update(transaction.id, { isExpired: true });
    }
  }

  // Tier Upgrade Logic
  async checkTierUpgrade(userId: string): Promise<boolean> {
    const userLoyalty = await this.getUserLoyalty(userId);
    const allTiers = await this.getAllTiers();
    
    // Find current tier index
    const currentTierIndex = allTiers.findIndex(t => t.level === userLoyalty.currentTier);
    
    // Check if eligible for higher tier
    for (let i = currentTierIndex + 1; i < allTiers.length; i++) {
      const nextTier = allTiers[i];
      const requirements = nextTier.requirements;
      
      const meetsRequirements = 
        (!requirements.minPoints || userLoyalty.totalPoints >= requirements.minPoints) &&
        (!requirements.minTradeVolume || userLoyalty.lifetimeTradeVolume >= requirements.minTradeVolume) &&
        (!requirements.minTrades || userLoyalty.lifetimeTrades >= requirements.minTrades) &&
        (!requirements.minDeposit || userLoyalty.lifetimeDeposits >= requirements.minDeposit);

      if (meetsRequirements) {
        await this.upgradeTier(userId, nextTier);
        return true;
      }
    }

    // Calculate progress to next tier
    if (currentTierIndex < allTiers.length - 1) {
      const nextTier = allTiers[currentTierIndex + 1];
      await this.updateProgressToNextTier(userId, nextTier, userLoyalty);
    }

    return false;
  }

  private async upgradeTier(userId: string, newTier: LoyaltyTier): Promise<void> {
    const userLoyalty = await this.getUserLoyalty(userId);
    
    const tierHistory = userLoyalty.tierHistory || [];
    // Mark previous tier as left
    if (tierHistory.length > 0) {
      tierHistory[tierHistory.length - 1].leftAt = new Date();
    }
    
    // Add new tier
    tierHistory.push({
      tier: newTier.level,
      achievedAt: new Date(),
    });

    await this.userLoyaltyRepo.update(userId, {
      currentTier: newTier.level,
      currentTierId: newTier.id,
      pointsMultiplier: newTier.benefits.pointsMultiplier || 1,
      tradingFeeDiscount: newTier.benefits.tradingFeeDiscount || 0,
      withdrawalFeeDiscount: newTier.benefits.withdrawalFeeDiscount || 0,
      tierAchievedAt: new Date(),
      tierHistory,
      isVip: newTier.level === TierLevel.PLATINUM || newTier.level === TierLevel.DIAMOND,
      hasDedicatedManager: newTier.benefits.dedicatedManager || false,
      hasEarlyAccess: newTier.benefits.earlyFeatureAccess || false,
    });

    // Update tier member count
    await this.tierRepo.decrement({ level: userLoyalty.currentTier }, 'currentMembers', 1);
    await this.tierRepo.increment({ level: newTier.level }, 'currentMembers', 1);

    // Award tier upgrade bonus
    const bonusPoints = 1000 * (newTier.order || 1);
    await this.awardPoints(
      userId,
      bonusPoints,
      PointsSource.PROMOTION,
      newTier.id,
      'tier_upgrade',
      `Tier upgrade bonus to ${newTier.name}`
    );
  }

  private async updateProgressToNextTier(
    userId: string,
    nextTier: LoyaltyTier,
    userLoyalty: UserLoyalty
  ): Promise<void> {
    const requirements = nextTier.requirements;
    
    const pointsNeeded = Math.max(0, (requirements.minPoints || 0) - userLoyalty.totalPoints);
    const volumeNeeded = Math.max(0, (requirements.minTradeVolume || 0) - Number(userLoyalty.lifetimeTradeVolume));
    const tradesNeeded = Math.max(0, (requirements.minTrades || 0) - userLoyalty.lifetimeTrades);

    const totalRequired = 
      (requirements.minPoints || 0) +
      (requirements.minTradeVolume || 0) / 1000 + // Scale down
      (requirements.minTrades || 0) * 10; // Scale up

    const totalProgress = 
      userLoyalty.totalPoints +
      Number(userLoyalty.lifetimeTradeVolume) / 1000 +
      userLoyalty.lifetimeTrades * 10;

    const progressPercentage = totalRequired > 0 ? (totalProgress / totalRequired) * 100 : 0;

    await this.userLoyaltyRepo.update(userId, {
      progressToNextTier: {
        nextTier: nextTier.level,
        pointsNeeded,
        volumeNeeded,
        tradesNeeded,
        progressPercentage: Math.min(100, progressPercentage),
      },
    });
  }

  // Trading Activity Updates
  async recordTrade(userId: string, tradeVolume: number): Promise<void> {
    const userLoyalty = await this.getUserLoyalty(userId);

    // Award points based on trade volume (e.g., 1 point per $10 traded)
    const points = Math.floor(tradeVolume / 10);
    if (points > 0) {
      await this.awardPoints(
        userId,
        points,
        PointsSource.TRADE,
        undefined,
        undefined,
        `Trade volume: $${tradeVolume.toFixed(2)}`
      );
    }

    // Update trading stats
    await this.userLoyaltyRepo.update(userId, {
      lifetimeTradeVolume: Number(userLoyalty.lifetimeTradeVolume) + tradeVolume,
      lifetimeTrades: userLoyalty.lifetimeTrades + 1,
      lastTradeDate: new Date(),
      currentTradingStreak: this.calculateStreak(userLoyalty.lastTradeDate, userLoyalty.currentTradingStreak),
    });

    // Check for tier upgrade
    await this.checkTierUpgrade(userId);
  }

  async recordDeposit(userId: string, amount: number): Promise<void> {
    const userLoyalty = await this.getUserLoyalty(userId);

    // Award points for deposits (e.g., 1 point per $1 deposited)
    const points = Math.floor(amount);
    if (points > 0) {
      await this.awardPoints(
        userId,
        points,
        PointsSource.DEPOSIT,
        undefined,
        undefined,
        `Deposit: $${amount.toFixed(2)}`
      );
    }

    await this.userLoyaltyRepo.update(userId, {
      lifetimeDeposits: Number(userLoyalty.lifetimeDeposits) + amount,
    });

    await this.checkTierUpgrade(userId);
  }

  // Streaks
  async recordLogin(userId: string): Promise<void> {
    const userLoyalty = await this.getUserLoyalty(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastLogin = userLoyalty.lastLoginDate ? new Date(userLoyalty.lastLoginDate) : null;
    if (lastLogin) {
      lastLogin.setHours(0, 0, 0, 0);
    }

    let newStreak = 1;
    if (lastLogin) {
      const diffDays = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Same day, don't update
        return;
      } else if (diffDays === 1) {
        // Consecutive day
        newStreak = userLoyalty.currentLoginStreak + 1;
      }
    }

    const longestStreak = Math.max(userLoyalty.longestLoginStreak, newStreak);

    await this.userLoyaltyRepo.update(userId, {
      currentLoginStreak: newStreak,
      longestLoginStreak: longestStreak,
      lastLoginDate: new Date(),
    });

    // Award streak bonuses
    if (newStreak % 7 === 0) {
      // Weekly streak bonus
      await this.awardPoints(
        userId,
        newStreak * 10,
        PointsSource.STREAK,
        undefined,
        undefined,
        `${newStreak}-day login streak bonus`
      );
    }
  }

  private calculateStreak(lastDate: Date | null, currentStreak: number): number {
    if (!lastDate) return 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last = new Date(lastDate);
    last.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return currentStreak;
    if (diffDays === 1) return currentStreak + 1;
    return 1;
  }

  // Special Rewards
  async processBirthdayRewards(): Promise<void> {
    const today = new Date();
    const todayMD = `${today.getMonth() + 1}-${today.getDate()}`;

    const users = await this.userLoyaltyRepo
      .createQueryBuilder('ul')
      .where("TO_CHAR(ul.birthday, 'MM-DD') = :todayMD", { todayMD })
      .getMany();

    for (const user of users) {
      // Check if already rewarded this year
      const lastReward = user.lastBirthdayRewardAt;
      if (lastReward) {
        const lastYear = lastReward.getFullYear();
        if (lastYear === today.getFullYear()) continue;
      }

      const tier = await this.tierRepo.findOne({ where: { id: user.currentTierId } });
      const birthdayBonus = tier?.benefits.birthdayBonus || 500;

      await this.awardPoints(
        user.userId,
        birthdayBonus,
        PointsSource.BIRTHDAY,
        undefined,
        undefined,
        'Happy Birthday! 🎉'
      );

      await this.userLoyaltyRepo.update(user.userId, {
        lastBirthdayRewardAt: new Date(),
      });
    }
  }

  async processAnniversaryRewards(): Promise<void> {
    const today = new Date();
    const todayMD = `${today.getMonth() + 1}-${today.getDate()}`;

    const users = await this.userLoyaltyRepo
      .createQueryBuilder('ul')
      .where("TO_CHAR(ul.accountAnniversary, 'MM-DD') = :todayMD", { todayMD })
      .getMany();

    for (const user of users) {
      const lastReward = user.lastAnniversaryRewardAt;
      if (lastReward) {
        const lastYear = lastReward.getFullYear();
        if (lastYear === today.getFullYear()) continue;
      }

      const yearsSince = today.getFullYear() - new Date(user.accountAnniversary).getFullYear();
      const tier = await this.tierRepo.findOne({ where: { id: user.currentTierId } });
      const anniversaryBonus = (tier?.benefits.anniversaryBonus || 1000) * yearsSince;

      await this.awardPoints(
        user.userId,
        anniversaryBonus,
        PointsSource.ANNIVERSARY,
        undefined,
        undefined,
        `${yearsSince}-year anniversary reward! 🎊`
      );

      await this.userLoyaltyRepo.update(user.userId, {
        lastAnniversaryRewardAt: new Date(),
      });
    }
  }

  // Get User Status
  async getUserLoyalty(userId: string): Promise<UserLoyalty> {
    const loyalty = await this.userLoyaltyRepo.findOne({ 
      where: { userId },
      relations: ['tier']
    });
    
    if (!loyalty) {
      return this.initializeUserLoyalty(userId);
    }
    
    return loyalty;
  }

  async getLoyaltyStatus(userId: string): Promise<any> {
    const userLoyalty = await this.getUserLoyalty(userId);
    const tier = await this.tierRepo.findOne({ where: { id: userLoyalty.currentTierId } });
    
    return {
      ...userLoyalty,
      tier,
      benefits: tier?.benefits,
    };
  }

  // Transaction History
  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<LoyaltyTransaction[]> {
    return this.transactionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}
