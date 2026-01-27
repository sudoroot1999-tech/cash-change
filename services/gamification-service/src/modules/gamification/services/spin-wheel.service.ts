import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpinWheel, SpinWheelType, PrizeType } from '../entities/spin-wheel.entity';
import { DailySpin } from '../entities/daily-spin.entity';
import { LevelService } from './level.service';
import { RewardService } from './reward.service';
import { BadgeService } from './badge.service';
import { XpSource } from '../entities/xp-transaction.entity';

@Injectable()
export class SpinWheelService {
  constructor(
    @InjectRepository(SpinWheel)
    private spinRepository: Repository<SpinWheel>,
    @InjectRepository(DailySpin)
    private dailySpinRepository: Repository<DailySpin>,
    private levelService: LevelService,
    private rewardService: RewardService,
    private badgeService: BadgeService,
  ) {}

  async spin(userId: string, wheelType: SpinWheelType): Promise<SpinWheel> {
    // Check daily spin availability
    if (wheelType === SpinWheelType.DAILY) {
      const canSpin = await this.checkDailySpinAvailability(userId);
      if (!canSpin) {
        throw new BadRequestException('No daily spins available');
      }
    }

    // Generate prize
    const prize = await this.generatePrize(wheelType);
    const spinResult = Math.floor(Math.random() * 100);
    
    const spin = this.spinRepository.create({
      userId,
      wheelType,
      prizeType: prize.type,
      prizeValue: prize.value,
      spinResult,
      isJackpot: prize.isJackpot || false,
      jackpotMultiplier: (prize as any).multiplier || 1,
    });

    await this.spinRepository.save(spin);

    // Award prize
    await this.awardPrize(userId, prize);

    // Update daily spin tracking
    if (wheelType === SpinWheelType.DAILY) {
      await this.updateDailySpinUsage(userId);
    }

    return spin;
  }

  async purchaseExtraSpin(userId: string, tokenCost: number): Promise<void> {
    // Deduct tokens (integrate with wallet service)
    // For now, just update daily spin
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dailySpin = await this.dailySpinRepository.findOne({
      where: {
        userId,
        spinDate: today,
      },
    });

    if (!dailySpin) {
      dailySpin = this.dailySpinRepository.create({
        userId,
        spinDate: today,
        spinsAvailable: 1,
        spinsUsed: 0,
      });
    }

    dailySpin.extraSpinsPurchased++;
    dailySpin.spinsAvailable++;

    await this.dailySpinRepository.save(dailySpin);
  }

  async checkDailySpinAvailability(userId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailySpin = await this.dailySpinRepository.findOne({
      where: {
        userId,
        spinDate: today,
      },
    });

    if (!dailySpin) {
      return true; // First spin of the day
    }

    return dailySpin.spinsUsed < dailySpin.spinsAvailable;
  }

  private async updateDailySpinUsage(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dailySpin = await this.dailySpinRepository.findOne({
      where: {
        userId,
        spinDate: today,
      },
    });

    if (!dailySpin) {
      dailySpin = this.dailySpinRepository.create({
        userId,
        spinDate: today,
        spinsAvailable: 1,
        spinsUsed: 0,
      });
    }

    dailySpin.spinsUsed++;
    await this.dailySpinRepository.save(dailySpin);
  }

  private async generatePrize(wheelType: SpinWheelType) {
    const random = Math.random() * 100;
    
    // Define prize probabilities
    const prizes = this.getPrizeTable(wheelType);
    
    let cumulative = 0;
    for (const prize of prizes) {
      cumulative += prize.probability;
      if (random <= cumulative) {
        return prize;
      }
    }
    
    // Fallback
    return prizes[prizes.length - 1];
  }

  private getPrizeTable(wheelType: SpinWheelType) {
    const basePrizes = [
      { type: PrizeType.TOKENS, value: { amount: 1 }, probability: 30, isJackpot: false },
      { type: PrizeType.TOKENS, value: { amount: 5 }, probability: 20, isJackpot: false },
      { type: PrizeType.TOKENS, value: { amount: 10 }, probability: 15, isJackpot: false },
      { type: PrizeType.XP, value: { amount: 50 }, probability: 15, isJackpot: false },
      { type: PrizeType.XP, value: { amount: 100 }, probability: 10, isJackpot: false },
      { type: PrizeType.FEE_DISCOUNT, value: { percentage: 5, duration: 7 }, probability: 5, isJackpot: false },
      { type: PrizeType.FEE_DISCOUNT, value: { percentage: 10, duration: 3 }, probability: 3, isJackpot: false },
      { type: PrizeType.NFT, value: { rarity: 'common' }, probability: 1, isJackpot: false },
      { type: PrizeType.NOTHING, value: {}, probability: 1, isJackpot: false },
    ];

    if (wheelType === SpinWheelType.JACKPOT) {
      basePrizes.push(
        { type: PrizeType.TOKENS, value: { amount: 100 }, probability: 0.5, isJackpot: true } as any,
        { type: PrizeType.NFT, value: { rarity: 'legendary' }, probability: 0.1, isJackpot: true } as any,
      );
    }

    return basePrizes;
  }

  private async awardPrize(userId: string, prize: any): Promise<void> {
    switch (prize.type) {
      case PrizeType.TOKENS:
        await this.rewardService.createReward({
          userId,
          type: 'tokens',
          title: 'Spin the Wheel Prize',
          description: 'Spin the Wheel',
          amount: prize.value.amount,
          sourceType: 'spin_wheel',
        });
        break;

      case PrizeType.XP:
        await this.levelService.addXp(userId, prize.value.amount, XpSource.SPIN_WHEEL);
        break;

      case PrizeType.FEE_DISCOUNT:
        // Apply fee discount (integrate with user settings)
        await this.rewardService.createReward({
          userId,
          type: 'fee_discount',
          title: 'Fee Discount Prize',
          description: 'Spin the Wheel',
          amount: prize.value,
          sourceType: 'spin_wheel',
        });
        break;

      case PrizeType.NFT:
        // Mint NFT (integrate with NFT service)
        await this.rewardService.createReward({
          userId,
          type: 'nft',
          title: 'NFT Prize',
          description: 'Spin the Wheel',
          amount: prize.value,
          sourceType: 'spin_wheel',
        });
        break;

      case PrizeType.BADGE:
        await this.badgeService.awardBadge(userId, prize.value.badgeId);
        break;

      case PrizeType.NOTHING:
        // Better luck next time!
        break;
    }

    if (prize.isJackpot) {
      // Award jackpot badge
      await this.badgeService.awardBadge(userId, 'jackpot_winner');
    }
  }

  async getUserSpinHistory(userId: string, limit: number = 50) {
    return await this.spinRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUserSpinStats(userId: string) {
    const spins = await this.spinRepository.find({
      where: { userId },
    });

    const totalSpins = spins.length;
    const jackpots = spins.filter(s => s.isJackpot).length;
    const prizesByType = spins.reduce((acc, spin) => {
      acc[spin.prizeType] = (acc[spin.prizeType] || 0) + 1;
      return acc;
    }, {} as Record<PrizeType, number>);

    return {
      totalSpins,
      jackpots,
      prizesByType,
    };
  }
}
