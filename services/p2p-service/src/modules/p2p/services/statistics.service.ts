import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStatistics } from '../entities/user-statistics.entity';
import { P2pTrade, TradeStatus } from '../entities/p2p-trade.entity';
import { DisputeResolution } from '../entities/p2p-dispute.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(UserStatistics)
    private statisticsRepository: Repository<UserStatistics>,
  ) {}

  async getUserStatistics(userId: string): Promise<UserStatistics> {
    let stats = await this.statisticsRepository.findOne({ where: { userId } });

    if (!stats) {
      stats = this.statisticsRepository.create({ userId });
      stats = await this.statisticsRepository.save(stats);
    }

    return stats;
  }

  async updateAfterTrade(trade: P2pTrade): Promise<void> {
    // Update buyer statistics
    await this.updateUserTradeStats(trade.buyerId, trade);

    // Update seller statistics
    await this.updateUserTradeStats(trade.sellerId, trade);
  }

  private async updateUserTradeStats(userId: string, trade: P2pTrade): Promise<void> {
    let stats = await this.statisticsRepository.findOne({ where: { userId } });

    if (!stats) {
      stats = this.statisticsRepository.create({ userId });
    }

    stats.totalTrades += 1;

    if (trade.status === TradeStatus.COMPLETED) {
      stats.completedTrades += 1;
      stats.totalVolume += trade.fiatAmount;
      stats.lastTradeAt = new Date();

      // Calculate completion rate
      stats.completionRate = (stats.completedTrades / stats.totalTrades) * 100;

      // Update average release time for sellers
      if (trade.sellerId === userId && trade.completedAt && trade.paidAt) {
        const releaseTime = (trade.completedAt.getTime() - trade.paidAt.getTime()) / (1000 * 60);
        if (stats.averageReleaseTime === 0) {
          stats.averageReleaseTime = releaseTime;
        } else {
          stats.averageReleaseTime = (stats.averageReleaseTime + releaseTime) / 2;
        }
      }
    } else if (trade.status === TradeStatus.CANCELLED) {
      stats.cancelledTrades += 1;
    }

    await this.statisticsRepository.save(stats);
  }

  async updateAfterDisputeResolution(trade: P2pTrade, resolution: DisputeResolution): Promise<void> {
    // Update buyer statistics
    let buyerStats = await this.getUserStatistics(trade.buyerId);
    buyerStats.disputedTrades += 1;
    await this.statisticsRepository.save(buyerStats);

    // Update seller statistics
    let sellerStats = await this.getUserStatistics(trade.sellerId);
    sellerStats.disputedTrades += 1;
    await this.statisticsRepository.save(sellerStats);

    // If completed after dispute, count as completed
    if (resolution === DisputeResolution.BUYER_WINS) {
      buyerStats.completedTrades += 1;
      buyerStats.totalVolume += trade.fiatAmount;
      buyerStats.completionRate = (buyerStats.completedTrades / buyerStats.totalTrades) * 100;
      await this.statisticsRepository.save(buyerStats);

      sellerStats.completedTrades += 1;
      sellerStats.completionRate = (sellerStats.completedTrades / sellerStats.totalTrades) * 100;
      await this.statisticsRepository.save(sellerStats);
    }
  }

  async getLeaderboard(limit: number = 10): Promise<UserStatistics[]> {
    return this.statisticsRepository.find({
      order: {
        trustScore: 'DESC',
        completedTrades: 'DESC',
      },
      take: limit,
    });
  }

  async getTopTraders(limit: number = 10): Promise<UserStatistics[]> {
    return this.statisticsRepository.find({
      where: { isTrusted: true },
      order: {
        totalVolume: 'DESC',
      },
      take: limit,
    });
  }
}
