import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UserProfile, Post, CopyTradingRelationship, CopyTradingStatus } from '../../database/entities';

export enum AnalyticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  ALL_TIME = 'all_time',
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(UserProfile)
    private userRepo: Repository<UserProfile>,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(CopyTradingRelationship)
    private copyRepo: Repository<CopyTradingRelationship>,
  ) {}

  async getProfileAnalytics(userId: string, period: AnalyticsPeriod) {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) return null;

    const startDate = this.getStartDate(period);
    const posts = await this.postRepo.find({ where: { authorId: userId, createdAt: MoreThan(startDate) } });

    const totalLikes = posts.reduce((sum, p) => sum + p.likesCount, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.commentsCount, 0);
    const totalViews = posts.reduce((sum, p) => sum + p.viewsCount, 0);

    return {
      totalFollowers: user.followersCount,
      totalFollowing: user.followingCount,
      totalPosts: user.postsCount,
      postsInPeriod: posts.length,
      totalLikes,
      totalComments,
      totalViews,
      newFollowers: 0, // Would need follower history tracking
      engagementRate: totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0,
    };
  }

  async getTradingAnalytics(userId: string, period: AnalyticsPeriod) {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) return null;

    return {
      totalPnl: user.totalPnl,
      winRate: user.winRate,
      riskScore: user.riskScore,
      totalTrades: user.tradingStats?.totalTrades || 0,
      winningTrades: user.tradingStats?.winningTrades || 0,
      losingTrades: user.tradingStats?.losingTrades || 0,
      avgProfit: user.tradingStats?.avgProfit || 0,
      avgLoss: user.tradingStats?.avgLoss || 0,
      bestTrade: user.tradingStats?.bestTrade || 0,
      worstTrade: user.tradingStats?.worstTrade || 0,
    };
  }

  async getCopyTradingAnalytics(userId: string) {
    const [copying, copiers] = await Promise.all([
      this.copyRepo.find({ where: { copierId: userId }, relations: ['trader'] }),
      this.copyRepo.find({ where: { traderId: userId, status: CopyTradingStatus.ACTIVE }, relations: ['copier'] }),
    ]);

    const totalCopyingPnl = copying.reduce((sum, c) => sum + Number(c.totalPnl), 0);
    const totalCopiersPnl = copiers.reduce((sum, c) => sum + Number(c.totalPnl), 0);

    return {
      tradersICopy: copying.length,
      activeCopiers: copiers.length,
      totalCopyingPnl,
      totalCopiersPnl,
      copyingDetails: copying.map((c) => ({
        trader: c.trader,
        pnl: c.totalPnl,
        trades: c.totalCopiedTrades,
        status: c.status,
      })),
      copiersDetails: copiers.map((c) => ({
        copier: c.copier,
        pnl: c.totalPnl,
        trades: c.totalCopiedTrades,
        allocatedAmount: c.allocatedAmount,
      })),
    };
  }

  async getEngagementAnalytics(userId: string, period: AnalyticsPeriod) {
    const startDate = this.getStartDate(period);
    const posts = await this.postRepo.find({
      where: { authorId: userId, createdAt: MoreThan(startDate) },
      order: { createdAt: 'DESC' },
    });

    const totalEngagement = posts.reduce((sum, p) => sum + p.likesCount + p.commentsCount + p.sharesCount, 0);
    const totalReach = posts.reduce((sum, p) => sum + p.viewsCount, 0);

    const topPosts = [...posts].sort((a, b) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount)).slice(0, 5);

    return {
      totalPosts: posts.length,
      totalEngagement,
      totalReach,
      avgEngagementPerPost: posts.length > 0 ? totalEngagement / posts.length : 0,
      avgReachPerPost: posts.length > 0 ? totalReach / posts.length : 0,
      topPosts,
    };
  }

  private getStartDate(period: AnalyticsPeriod): Date {
    const now = new Date();
    switch (period) {
      case AnalyticsPeriod.DAY: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case AnalyticsPeriod.WEEK: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case AnalyticsPeriod.MONTH: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case AnalyticsPeriod.YEAR: return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default: return new Date(0);
    }
  }
}
