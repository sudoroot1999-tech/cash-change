import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MiniGame, MiniGameType, GameStatus } from '../entities/mini-game.entity';
import { RewardService } from './reward.service';
import { FraudDetectionService } from './fraud-detection.service';

@Injectable()
export class MiniGameService {
  private readonly logger = new Logger(MiniGameService.name);
  private readonly dailySpinLimit: number;
  private readonly weeklySpinLimit: number;

  constructor(
    @InjectRepository(MiniGame)
    private readonly miniGameRepository: Repository<MiniGame>,
    private readonly rewardService: RewardService,
    private readonly fraudDetectionService: FraudDetectionService,
    private readonly configService: ConfigService,
  ) {
    this.dailySpinLimit = this.configService.get<number>('DAILY_SPIN_LIMIT', 1);
    this.weeklySpinLimit = this.configService.get<number>('WEEKLY_SPIN_LIMIT', 1);
  }

  async playPricePrediction(
    userId: string,
    symbol: string,
    direction: 'up' | 'down',
    timeWindowMinutes: number,
  ): Promise<MiniGame> {
    // Check for fraud
    await this.fraudDetectionService.checkGameAbuse(userId, MiniGameType.PRICE_PREDICTION);

    // Get current price (would integrate with market data service)
    const currentPrice = await this.getCurrentPrice(symbol);

    const game = this.miniGameRepository.create({
      userId,
      gameType: MiniGameType.PRICE_PREDICTION,
      status: GameStatus.IN_PROGRESS,
      data: {
        symbol,
        direction,
        timeWindowMinutes,
        startPrice: currentPrice,
        predictedAt: new Date(),
      },
      startedAt: new Date(),
    });

    await this.miniGameRepository.save(game);

    // Schedule result check (in production, use a job queue)
    setTimeout(
      () => this.checkPricePredictionResult(game.id),
      timeWindowMinutes * 60 * 1000,
    );

    return game;
  }

  async playSpinWheel(userId: string, spinType: 'daily' | 'weekly'): Promise<MiniGame> {
    // Check spin limits
    const limit = spinType === 'daily' ? this.dailySpinLimit : this.weeklySpinLimit;
    const since = new Date();
    if (spinType === 'daily') {
      since.setDate(since.getDate() - 1);
    } else {
      since.setDate(since.getDate() - 7);
    }

    const recentSpins = await this.miniGameRepository.count({
      where: {
        userId,
        gameType: MiniGameType.SPIN_WHEEL,
        createdAt: MoreThan(since),
      },
    });

    if (recentSpins >= limit) {
      throw new BadRequestException(`${spinType} spin limit reached`);
    }

    // Determine prize
    const prize = this.spinWheelPrize();

    const game = this.miniGameRepository.create({
      userId,
      gameType: MiniGameType.SPIN_WHEEL,
      status: GameStatus.COMPLETED,
      data: {
        spinType,
      },
      result: {
        prize: prize.type,
        value: prize.value,
      },
      score: prize.value,
      xpEarned: prize.xp,
      tokensEarned: prize.tokens,
      isWin: true,
      startedAt: new Date(),
      completedAt: new Date(),
    });

    await this.miniGameRepository.save(game);

    // Grant rewards
    if (prize.tokens > 0) {
      await this.rewardService.createReward({
        userId,
        type: 'TOKEN',
        title: 'Spin Wheel Prize',
        description: `Won ${prize.tokens} tokens from spin wheel!`,
        amount: prize.tokens,
        sourceType: 'mini_game',
        sourceId: game.id,
      });
    }

    return game;
  }

  async playQuiz(
    userId: string,
    questions: Array<{ id: string; answer: string }>,
  ): Promise<MiniGame> {
    // Check for fraud
    await this.fraudDetectionService.checkGameAbuse(userId, MiniGameType.QUIZ);

    const correctAnswers = await this.validateQuizAnswers(questions);
    const score = (correctAnswers / questions.length) * 100;
    const xpEarned = Math.floor(score);
    const tokensEarned = score >= 80 ? 10 : score >= 60 ? 5 : 0;

    const game = this.miniGameRepository.create({
      userId,
      gameType: MiniGameType.QUIZ,
      status: GameStatus.COMPLETED,
      data: {
        totalQuestions: questions.length,
        userAnswers: questions,
      },
      result: {
        correctAnswers,
        totalQuestions: questions.length,
        percentage: score,
      },
      score,
      xpEarned,
      tokensEarned,
      isWin: score >= 60,
      startedAt: new Date(),
      completedAt: new Date(),
    });

    await this.miniGameRepository.save(game);

    // Grant rewards
    if (tokensEarned > 0) {
      await this.rewardService.createReward({
        userId,
        type: 'TOKEN',
        title: 'Quiz Completion Reward',
        description: `Scored ${score}% on the quiz!`,
        amount: tokensEarned,
        sourceType: 'mini_game',
        sourceId: game.id,
      });
    }

    return game;
  }

  async getUserGameHistory(
    userId: string,
    gameType?: MiniGameType,
    limit: number = 50,
  ): Promise<MiniGame[]> {
    const where: any = { userId };
    
    if (gameType) {
      where.gameType = gameType;
    }

    return this.miniGameRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getGameStats(userId: string): Promise<any> {
    const games = await this.miniGameRepository.find({
      where: { userId },
    });

    const stats = {
      totalGames: games.length,
      totalWins: games.filter(g => g.isWin).length,
      totalXpEarned: games.reduce((sum, g) => sum + g.xpEarned, 0),
      totalTokensEarned: games.reduce((sum, g) => sum + Number(g.tokensEarned), 0),
      byGameType: {} as Record<string, any>,
    };

    Object.values(MiniGameType).forEach(type => {
      const typeGames = games.filter(g => g.gameType === type);
      stats.byGameType[type] = {
        played: typeGames.length,
        won: typeGames.filter(g => g.isWin).length,
        winRate: typeGames.length > 0 
          ? (typeGames.filter(g => g.isWin).length / typeGames.length) * 100 
          : 0,
      };
    });

    return stats;
  }

  private async checkPricePredictionResult(gameId: string): Promise<void> {
    const game = await this.miniGameRepository.findOne({
      where: { id: gameId },
    });

    if (!game || game.status !== GameStatus.IN_PROGRESS) {
      return;
    }

    const { symbol, direction, startPrice } = game.data;
    const endPrice = await this.getCurrentPrice(symbol);

    const isWin =
      (direction === 'up' && endPrice > startPrice) ||
      (direction === 'down' && endPrice < startPrice);

    const priceChange = ((endPrice - startPrice) / startPrice) * 100;
    const xpEarned = isWin ? 50 : 10;
    const tokensEarned = isWin ? 5 : 0;

    game.status = GameStatus.COMPLETED;
    game.result = {
      startPrice,
      endPrice,
      priceChange,
      correct: isWin,
    };
    game.isWin = isWin;
    game.xpEarned = xpEarned;
    game.tokensEarned = tokensEarned;
    game.completedAt = new Date();

    await this.miniGameRepository.save(game);

    // Grant rewards
    if (isWin && tokensEarned > 0) {
      await this.rewardService.createReward({
        userId: game.userId,
        type: 'TOKEN',
        title: 'Price Prediction Win',
        description: `Correctly predicted ${symbol} would go ${direction}!`,
        amount: tokensEarned,
        sourceType: 'mini_game',
        sourceId: game.id,
      });
    }

    this.logger.log(`Price prediction ${gameId} completed. Result: ${isWin ? 'WIN' : 'LOSS'}`);
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    // In production, integrate with market-data service
    // For now, return mock price
    return 50000 + Math.random() * 1000;
  }

  private spinWheelPrize(): { type: string; value: number; xp: number; tokens: number } {
    const random = Math.random() * 100;

    if (random < 1) {
      // 1% - Jackpot
      return { type: 'JACKPOT', value: 100, xp: 500, tokens: 100 };
    } else if (random < 5) {
      // 4% - Epic
      return { type: 'EPIC', value: 50, xp: 200, tokens: 50 };
    } else if (random < 15) {
      // 10% - Rare
      return { type: 'RARE', value: 25, xp: 100, tokens: 25 };
    } else if (random < 40) {
      // 25% - Uncommon
      return { type: 'UNCOMMON', value: 10, xp: 50, tokens: 10 };
    } else {
      // 60% - Common
      return { type: 'COMMON', value: 5, xp: 25, tokens: 5 };
    }
  }

  private async validateQuizAnswers(
    questions: Array<{ id: string; answer: string }>,
  ): Promise<number> {
    // In production, validate against quiz database
    // For now, return random score
    return Math.floor(Math.random() * questions.length) + 1;
  }
}
