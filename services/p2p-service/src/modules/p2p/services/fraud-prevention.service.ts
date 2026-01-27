import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { P2pTrade, TradeStatus } from '../entities/p2p-trade.entity';
import { UserStatistics } from '../entities/user-statistics.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FraudPreventionService {
  private readonly maxOpenTrades: number;
  // private readonly minAccountAgeDays: number; // Reserved for future account age validation
  private readonly maxDailyVolume: number;

  constructor(
    @InjectRepository(P2pTrade)
    private tradeRepository: Repository<P2pTrade>,
    @InjectRepository(UserStatistics)
    private statisticsRepository: Repository<UserStatistics>,
    private configService: ConfigService,
  ) {
    this.maxOpenTrades = parseInt(this.configService.get('MAX_OPEN_TRADES_PER_USER') || '5');
    // this.minAccountAgeDays = parseInt(this.configService.get('MIN_ACCOUNT_AGE_DAYS') || '1');
    this.maxDailyVolume = parseFloat(this.configService.get('MAX_DAILY_TRADE_VOLUME') || '100000');
  }

  async checkTradeEligibility(userId: string, amount: number): Promise<void> {
    // Check open trades limit
    const openTrades = await this.tradeRepository.count({
      where: [
        { buyerId: userId, status: TradeStatus.PENDING },
        { buyerId: userId, status: TradeStatus.PAID },
        { sellerId: userId, status: TradeStatus.PENDING },
        { sellerId: userId, status: TradeStatus.PAID },
      ],
    });

    if (openTrades >= this.maxOpenTrades) {
      throw new BadRequestException(
        `You have reached the maximum limit of ${this.maxOpenTrades} open trades`,
      );
    }

    // Check daily volume limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyVolume = await this.tradeRepository
      .createQueryBuilder('trade')
      .select('SUM(trade.fiatAmount)', 'total')
      .where('(trade.buyerId = :userId OR trade.sellerId = :userId)', { userId })
      .andWhere('trade.createdAt >= :today', { today })
      .andWhere('trade.status != :cancelled', { cancelled: TradeStatus.CANCELLED })
      .getRawOne();

    const totalVolume = parseFloat(dailyVolume?.total || '0');

    if (totalVolume + amount > this.maxDailyVolume) {
      throw new BadRequestException(
        `Daily trade volume limit of ${this.maxDailyVolume} would be exceeded`,
      );
    }

    // Check user reputation for high-value trades
    if (amount > 10000) {
      const stats = await this.statisticsRepository.findOne({ where: { userId } });

      if (stats) {
        // Require minimum completed trades for high-value
        if (stats.completedTrades < 5) {
          throw new ForbiddenException('You need at least 5 completed trades to make high-value trades');
        }

        // Check trust score
        if (stats.trustScore < 50) {
          throw new ForbiddenException('Your trust score is too low for high-value trades');
        }

        // Check completion rate
        if (stats.completionRate < 80) {
          throw new ForbiddenException('Your completion rate is too low for high-value trades');
        }
      }
    }
  }

  async detectSuspiciousActivity(userId: string): Promise<boolean> {
    const stats = await this.statisticsRepository.findOne({ where: { userId } });

    if (!stats) {
      return false;
    }

    // High cancellation rate
    if (stats.totalTrades > 10 && stats.cancelledTrades / stats.totalTrades > 0.3) {
      return true;
    }

    // High dispute rate
    if (stats.totalTrades > 10 && stats.disputedTrades / stats.totalTrades > 0.2) {
      return true;
    }

    // Multiple negative ratings
    if (stats.negativeRatings > 5 && stats.negativeRatings > stats.positiveRatings) {
      return true;
    }

    return false;
  }

  async checkPaymentProofValidity(proofUrls: string[]): Promise<boolean> {
    // Basic validation - check if URLs are valid
    if (!proofUrls || proofUrls.length === 0) {
      return true; // Optional
    }

    for (const url of proofUrls) {
      try {
        new URL(url);
      } catch {
        return false;
      }
    }

    return true;
  }

  async checkRapidTrading(userId: string): Promise<void> {
    // Check if user is creating trades too rapidly
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const recentTrades = await this.tradeRepository.count({
      where: [
        { buyerId: userId, createdAt: MoreThan(fiveMinutesAgo) },
        { sellerId: userId, createdAt: MoreThan(fiveMinutesAgo) },
      ],
    });

    if (recentTrades >= 3) {
      throw new BadRequestException('You are creating trades too rapidly. Please wait a few minutes');
    }
  }

  async validateUserCanTrade(userId: string, partnerId: string): Promise<void> {
    // Check if suspicious activity
    const isSuspicious = await this.detectSuspiciousActivity(userId);
    if (isSuspicious) {
      throw new ForbiddenException('Your account has been flagged for suspicious activity');
    }

    // Check rapid trading
    await this.checkRapidTrading(userId);

    // Don't allow trading with same user
    if (userId === partnerId) {
      throw new BadRequestException('You cannot trade with yourself');
    }
  }
}
