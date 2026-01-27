import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRating, RatingType } from '../entities/user-rating.entity';
import { P2pTrade, TradeStatus } from '../entities/p2p-trade.entity';
import { UserStatistics } from '../entities/user-statistics.entity';
import { CreateRatingDto } from '../dto/create-rating.dto';

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(UserRating)
    private ratingRepository: Repository<UserRating>,
    @InjectRepository(P2pTrade)
    private tradeRepository: Repository<P2pTrade>,
    @InjectRepository(UserStatistics)
    private statisticsRepository: Repository<UserStatistics>,
  ) {}

  async createRating(tradeId: string, userId: string, dto: CreateRatingDto): Promise<UserRating> {
    const trade = await this.tradeRepository.findOne({ where: { id: tradeId } });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.status !== TradeStatus.COMPLETED) {
      throw new BadRequestException('Can only rate completed trades');
    }

    if (trade.buyerId !== userId && trade.sellerId !== userId) {
      throw new ForbiddenException('You are not part of this trade');
    }

    // Determine who is being rated
    const ratedUserId = trade.buyerId === userId ? trade.sellerId : trade.buyerId;

    // Check if already rated
    const existingRating = await this.ratingRepository.findOne({
      where: { tradeId, raterUserId: userId },
    });

    if (existingRating) {
      throw new BadRequestException('You have already rated this trade');
    }

    // Create rating
    const rating = this.ratingRepository.create({
      tradeId,
      ratedUserId,
      raterUserId: userId,
      type: dto.type,
      rating: dto.rating,
      comment: dto.comment,
      anonymous: dto.anonymous || false,
    });

    const savedRating = await this.ratingRepository.save(rating);

    // Update user statistics
    await this.updateUserRatingStats(ratedUserId);

    return savedRating;
  }

  async getUserRatings(userId: string): Promise<UserRating[]> {
    return this.ratingRepository.find({
      where: { ratedUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getRatingByTrade(tradeId: string, userId: string): Promise<UserRating | null> {
    return this.ratingRepository.findOne({
      where: { tradeId, raterUserId: userId },
    });
  }

  private async updateUserRatingStats(userId: string): Promise<void> {
    const ratings = await this.ratingRepository.find({
      where: { ratedUserId: userId },
    });

    let positiveRatings = 0;
    let neutralRatings = 0;
    let negativeRatings = 0;
    let totalRatingValue = 0;

    ratings.forEach((rating) => {
      if (rating.type === RatingType.POSITIVE) {
        positiveRatings++;
      } else if (rating.type === RatingType.NEUTRAL) {
        neutralRatings++;
      } else if (rating.type === RatingType.NEGATIVE) {
        negativeRatings++;
      }

      totalRatingValue += rating.rating;
    });

    const averageRating = ratings.length > 0 ? totalRatingValue / ratings.length : 0;

    // Get or create user statistics
    let stats = await this.statisticsRepository.findOne({ where: { userId } });

    if (!stats) {
      stats = this.statisticsRepository.create({ userId });
    }

    stats.positiveRatings = positiveRatings;
    stats.neutralRatings = neutralRatings;
    stats.negativeRatings = negativeRatings;
    stats.averageRating = averageRating;

    // Calculate trust score (simple algorithm)
    stats.trustScore = this.calculateTrustScore(
      positiveRatings,
      neutralRatings,
      negativeRatings,
      stats.completedTrades,
      stats.completionRate,
    );

    stats.isTrusted = stats.trustScore >= 80 && stats.completedTrades >= 10;

    await this.statisticsRepository.save(stats);
  }

  private calculateTrustScore(
    positive: number,
    neutral: number,
    negative: number,
    completedTrades: number,
    completionRate: number,
  ): number {
    const totalRatings = positive + neutral + negative;

    if (totalRatings === 0) {
      return 0;
    }

    // Rating score (40% weight)
    const ratingScore = ((positive * 1 + neutral * 0.5 + negative * 0) / totalRatings) * 40;

    // Completion rate score (30% weight)
    const completionScore = (completionRate / 100) * 30;

    // Volume score (30% weight) - capped at 100+ trades
    const volumeScore = Math.min(completedTrades / 100, 1) * 30;

    return Math.round(ratingScore + completionScore + volumeScore);
  }

  async getRatingStats(userId: string): Promise<any> {
    const ratings = await this.ratingRepository.find({
      where: { ratedUserId: userId },
    });

    const stats = {
      total: ratings.length,
      positive: ratings.filter((r) => r.type === RatingType.POSITIVE).length,
      neutral: ratings.filter((r) => r.type === RatingType.NEUTRAL).length,
      negative: ratings.filter((r) => r.type === RatingType.NEGATIVE).length,
      averageRating: ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0,
    };

    return stats;
  }
}
