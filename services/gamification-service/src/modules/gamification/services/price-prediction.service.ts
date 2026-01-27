import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { PricePrediction, PredictionType, PredictionDifficulty } from '../entities/price-prediction.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LevelService } from './level.service';
import { XpSource } from '../entities/xp-transaction.entity';
import { MarketDataClient } from '@packages/utils';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class PricePredictionService {
  constructor(
    @InjectRepository(PricePrediction)
    private predictionRepository: Repository<PricePrediction>,
    private levelService: LevelService,
    private marketDataClient: MarketDataClient,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async createPrediction(
    userId: string,
    symbol: string,
    predictionType: PredictionType,
    duration: number,
    difficulty: PredictionDifficulty,
    prediction: any,
  ): Promise<PricePrediction> {
    // Fetch current price (integrate with market data service)
    const startPrice = await this.fetchCurrentPrice(symbol);

    const predictionTime = new Date();
    const settlementTime = new Date(predictionTime.getTime() + duration * 60000);

    // Check streak
    const streakCount = await this.getUserStreak(userId);

    const newPrediction = this.predictionRepository.create({
      userId,
      symbol,
      predictionType,
      duration,
      difficulty,
      startPrice,
      predictedDirection: prediction.direction,
      predictedRangeMin: prediction.rangeMin,
      predictedRangeMax: prediction.rangeMax,
      predictionTime,
      settlementTime,
      streakCount,
    });

    return await this.predictionRepository.save(newPrediction);
  }

  async settlePrediction(predictionId: string): Promise<PricePrediction> {
    const prediction = await this.predictionRepository.findOne({
      where: { id: predictionId },
    });

    if (!prediction) {
      throw new NotFoundException('Prediction not found');
    }

    if (prediction.settledAt) {
      throw new BadRequestException('Prediction already settled');
    }

    // Fetch actual price
    const actualPrice = await this.fetchCurrentPrice(prediction.symbol);
    prediction.actualPrice = actualPrice;

    // Check if correct
    let isCorrect = false;
    if (prediction.predictionType === PredictionType.UP_DOWN) {
      const priceChange = actualPrice - prediction.startPrice;
      isCorrect = 
        (prediction.predictedDirection === 'up' && priceChange > 0) ||
        (prediction.predictedDirection === 'down' && priceChange < 0);
    } else if (prediction.predictionType === PredictionType.EXACT_RANGE) {
      isCorrect = 
        actualPrice >= prediction.predictedRangeMin &&
        actualPrice <= prediction.predictedRangeMax;
    }

    prediction.isCorrect = isCorrect;

    // Calculate rewards
    if (isCorrect) {
      const baseXp = this.getBaseXp(prediction.difficulty);
      const streakBonus = Math.floor(baseXp * 0.1 * prediction.streakCount);
      prediction.xpEarned = baseXp + streakBonus;
      prediction.streakBonus = streakBonus;
      prediction.tokensEarned = this.getTokenReward(prediction.difficulty);
      prediction.score = this.calculateScore(prediction);

      // Award XP
      await this.levelService.addXp(prediction.userId, prediction.xpEarned, XpSource.PRICE_PREDICTION);

      // Update streak
      await this.updateStreak(prediction.userId, true);
    } else {
      // Reset streak
      await this.updateStreak(prediction.userId, false);
    }

    prediction.settledAt = new Date();
    return await this.predictionRepository.save(prediction);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async settleReadyPredictions() {
    const now = new Date();
    const predictions = await this.predictionRepository.find({
      where: {
        settledAt: IsNull(),
        settlementTime: Between(new Date(0), now),
      },
    });

    for (const prediction of predictions) {
      try {
        await this.settlePrediction(prediction.id);
      } catch (error) {
        console.error(`Error settling prediction ${prediction.id}:`, error);
      }
    }
  }

  async getUserStreak(userId: string): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const lastPrediction = await this.predictionRepository.findOne({
      where: {
        userId,
        isCorrect: true,
        settledAt: Between(yesterday, new Date()),
      },
      order: { settledAt: 'DESC' },
    });

    return lastPrediction?.streakCount || 0;
  }

  async updateStreak(userId: string, isCorrect: boolean): Promise<number> {
    const streakKey = `prediction:streak:${userId}`;
    const lastDateKey = `prediction:streak:date:${userId}`;
    
    const today = new Date().toISOString().split('T')[0];
    const lastDate = await this.redis.get(lastDateKey);
    
    let currentStreak = parseInt(await this.redis.get(streakKey) || '0', 10);
    
    if (isCorrect) {
      // Check if prediction is for today
      if (lastDate === today) {
        // Already had a prediction today, don't increment
        return currentStreak;
      }
      
      // Check if yesterday (streak continues)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastDate === yesterdayStr || !lastDate) {
        // Continue or start streak
        currentStreak++;
      } else {
        // Streak broken, restart
        currentStreak = 1;
      }
      
      await this.redis.set(streakKey, currentStreak.toString());
      await this.redis.set(lastDateKey, today);
    } else {
      // Wrong prediction resets streak
      currentStreak = 0;
      await this.redis.set(streakKey, '0');
      await this.redis.del(lastDateKey);
    }
    
    return currentStreak;
  }

  async getLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'all-time', limit: number = 100) {
    let startDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'all-time':
        startDate = new Date(0);
        break;
    }

    const results = await this.predictionRepository
      .createQueryBuilder('prediction')
      .select('prediction.userId', 'userId')
      .addSelect('COUNT(*)', 'totalPredictions')
      .addSelect('SUM(CASE WHEN prediction.isCorrect = true THEN 1 ELSE 0 END)', 'correctPredictions')
      .addSelect('SUM(prediction.score)', 'totalScore')
      .addSelect('AVG(CASE WHEN prediction.isCorrect = true THEN 1 ELSE 0 END) * 100', 'accuracy')
      .where('prediction.settledAt >= :startDate', { startDate })
      .groupBy('prediction.userId')
      .orderBy('totalScore', 'DESC')
      .limit(limit)
      .getRawMany();

    return results;
  }

  async getUserStats(userId: string) {
    const total = await this.predictionRepository.count({ where: { userId } });
    const correct = await this.predictionRepository.count({ 
      where: { userId, isCorrect: true } 
    });
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    const totalScore = await this.predictionRepository
      .createQueryBuilder('prediction')
      .select('SUM(prediction.score)', 'score')
      .where('prediction.userId = :userId', { userId })
      .getRawOne();

    const currentStreak = await this.getUserStreak(userId);

    return {
      totalPredictions: total,
      correctPredictions: correct,
      accuracy,
      totalScore: totalScore?.score || 0,
      currentStreak,
    };
  }

  private getBaseXp(difficulty: PredictionDifficulty): number {
    const xpMap = {
      [PredictionDifficulty.EASY]: 10,
      [PredictionDifficulty.MEDIUM]: 25,
      [PredictionDifficulty.HARD]: 50,
      [PredictionDifficulty.EXPERT]: 100,
    };
    return xpMap[difficulty];
  }

  private getTokenReward(difficulty: PredictionDifficulty): number {
    const rewardMap = {
      [PredictionDifficulty.EASY]: 0.1,
      [PredictionDifficulty.MEDIUM]: 0.5,
      [PredictionDifficulty.HARD]: 1,
      [PredictionDifficulty.EXPERT]: 5,
    };
    return rewardMap[difficulty];
  }

  private calculateScore(prediction: PricePrediction): number {
    let score = 100;
    
    // Difficulty multiplier
    const difficultyMultiplier = {
      [PredictionDifficulty.EASY]: 1,
      [PredictionDifficulty.MEDIUM]: 2,
      [PredictionDifficulty.HARD]: 3,
      [PredictionDifficulty.EXPERT]: 5,
    };
    
    score *= difficultyMultiplier[prediction.difficulty];
    
    // Accuracy bonus for range predictions
    if (prediction.predictionType === PredictionType.EXACT_RANGE) {
      const rangeSize = prediction.predictedRangeMax - prediction.predictedRangeMin;
      const priceRange = prediction.startPrice * 0.01; // 1% of start price
      const accuracyBonus = Math.max(0, 100 - (rangeSize / priceRange) * 100);
      score += accuracyBonus;
    }
    
    return Math.round(score);
  }

  private async fetchCurrentPrice(symbol: string): Promise<number> {
    // Use market data service for real-time prices
    return await this.marketDataClient.getPrice(symbol);
  }
}
