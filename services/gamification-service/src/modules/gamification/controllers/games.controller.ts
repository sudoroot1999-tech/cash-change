import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { PricePredictionService } from '../services/price-prediction.service';

// Extend Express Request to include user property
interface RequestWithUser extends Request {
  user?: {
    id: string;
    [key: string]: any;
  };
}
import { TradingSimulatorService } from '../services/trading-simulator.service';
import { QuizService } from '../services/quiz.service';
import { SpinWheelService } from '../services/spin-wheel.service';
import { TreasureHuntService } from '../services/treasure-hunt.service';
import { VirtualPetService } from '../services/virtual-pet.service';
import { GuildService } from '../services/guild.service';
import { TournamentService } from '../services/tournament.service';
import { LeaderboardService } from '../services/leaderboard.service';
import { PredictionType, PredictionDifficulty } from '../entities/price-prediction.entity';
import { SimulatorTradeType } from '../entities/simulator-trade.entity';
import { SpinWheelType } from '../entities/spin-wheel.entity';
import { PetSpecies } from '../entities/virtual-pet.entity';
import { LeaderboardType, LeaderboardPeriod } from '../entities/leaderboard.entity';

@Controller('games')
export class GamesController {
  constructor(
    private pricePredictionService: PricePredictionService,
    private tradingSimulatorService: TradingSimulatorService,
    private quizService: QuizService,
    private spinWheelService: SpinWheelService,
    private treasureHuntService: TreasureHuntService,
    private virtualPetService: VirtualPetService,
    private guildService: GuildService,
    private tournamentService: TournamentService,
    private leaderboardService: LeaderboardService,
  ) {}

  // ============= GENERAL GAMES =============
  @Get('available')
  async getAvailableGames() {
    return {
      games: [
        {
          id: 'price_prediction',
          name: 'Price Prediction',
          description: 'Predict BTC/ETH prices and win rewards',
          icon: '📈',
          available: true,
        },
        {
          id: 'trading_simulator',
          name: 'Trading Simulator',
          description: 'Practice trading with $100,000 virtual balance',
          icon: '💹',
          available: true,
        },
        {
          id: 'crypto_quiz',
          name: 'Crypto Quiz',
          description: 'Test your crypto knowledge',
          icon: '🧠',
          available: true,
        },
        {
          id: 'spin_wheel',
          name: 'Spin the Wheel',
          description: 'Daily free spin for prizes',
          icon: '🎡',
          available: true,
        },
        {
          id: 'treasure_hunt',
          name: 'Treasure Hunt',
          description: 'Find hidden rewards on platform',
          icon: '🗺️',
          available: true,
        },
        {
          id: 'virtual_pet',
          name: 'Virtual Pet',
          description: 'Adopt and battle with crypto pets',
          icon: '🐉',
          available: true,
        },
      ],
    };
  }

  // ============= PRICE PREDICTION =============
  @Post('prediction/submit')
  async submitPrediction(
    @Req() req: RequestWithUser,
    @Body() body: {
      symbol: string;
      predictionType: PredictionType;
      duration: number;
      difficulty: PredictionDifficulty;
      direction?: string;
      rangeMin?: number;
      rangeMax?: number;
    },
  ) {
    const userId = req.user?.id || 'demo-user';
    
    return await this.pricePredictionService.createPrediction(
      userId,
      body.symbol,
      body.predictionType,
      body.duration,
      body.difficulty,
      {
        direction: body.direction,
        rangeMin: body.rangeMin,
        rangeMax: body.rangeMax,
      },
    );
  }

  @Get('prediction/leaderboard')
  async getPredictionLeaderboard(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time',
    @Query('limit') limit: number = 100,
  ) {
    return await this.pricePredictionService.getLeaderboard(period, limit);
  }

  @Get('prediction/stats')
  async getPredictionStats(@Req() req: RequestWithUser) {
    const userId = req.user?.id || 'demo-user';
    return await this.pricePredictionService.getUserStats(userId);
  }

  // ============= TRADING SIMULATOR =============
  @Get('simulator/portfolio')
  async getSimulatorPortfolio(@Req() req: RequestWithUser) {
    const userId = req.user?.id || 'demo-user';
    return await this.tradingSimulatorService.getPortfolio(userId);
  }

  @Post('simulator/trade')
  async placeSimulatorTrade(
    @Req() req: RequestWithUser,
    @Body() body: {
      symbol: string;
      type: SimulatorTradeType;
      quantity: number;
      stopLoss?: number;
      takeProfit?: number;
      notes?: string;
      strategy?: string;
    },
  ) {
    const userId = req.user?.id || 'demo-user';
    
    return await this.tradingSimulatorService.placeTrade(
      userId,
      body.symbol,
      body.type,
      body.quantity,
      body.stopLoss,
      body.takeProfit,
      body.notes,
      body.strategy,
    );
  }

  @Post('simulator/trade/:tradeId/close')
  async closeSimulatorTrade(@Req() req: RequestWithUser, @Param('tradeId') tradeId: string) {
    const userId = req.user?.id || 'demo-user';
    return await this.tradingSimulatorService.closeTrade(userId, tradeId);
  }

  @Get('simulator/history')
  async getSimulatorHistory(@Req() req: RequestWithUser, @Query('limit') limit: number = 50) {
    const userId = req.user?.id || 'demo-user';
    return await this.tradingSimulatorService.getTradeHistory(userId, limit);
  }

  @Get('simulator/stats')
  async getSimulatorStats(@Req() req: RequestWithUser) {
    const userId = req.user?.id || 'demo-user';
    return await this.tradingSimulatorService.getStats(userId);
  }

  @Get('simulator/leaderboard')
  async getSimulatorLeaderboard(@Query('limit') limit: number = 100) {
    return await this.tradingSimulatorService.getLeaderboard(limit);
  }

  // ============= QUIZ GAME =============
  @Get('quiz/available')
  async getAvailableQuizzes(
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
  ) {
    return await this.quizService.getAvailableQuizzes(category as any, difficulty as any);
  }

  @Get('quiz/daily')
  async getDailyQuiz() {
    return await this.quizService.getDailyQuiz();
  }

  @Post('quiz/:quizId/start')
  async startQuiz(@Req() req: RequestWithUser, @Param('quizId') quizId: string) {
    const userId = req.user?.id || 'demo-user';
    return await this.quizService.startQuiz(userId, quizId);
  }

  @Get('quiz/session/:sessionId/questions')
  async getQuizQuestions(@Param('sessionId') sessionId: string) {
    return await this.quizService.getQuizQuestions(sessionId);
  }

  @Post('quiz/session/:sessionId/answer')
  async submitQuizAnswer(
    @Param('sessionId') sessionId: string,
    @Body() body: { questionId: string; answerId: string },
  ) {
    return await this.quizService.submitAnswer(sessionId, body.questionId, body.answerId);
  }

  @Post('quiz/session/:sessionId/complete')
  async completeQuiz(@Param('sessionId') sessionId: string) {
    return await this.quizService.completeQuiz(sessionId);
  }

  @Get('quiz/stats')
  async getQuizStats(@Req() req: RequestWithUser) {
    const userId = req.user?.id || 'demo-user';
    return await this.quizService.getUserQuizStats(userId);
  }

  @Get('quiz/leaderboard')
  async getQuizLeaderboard(
    @Query('category') category?: string,
    @Query('limit') limit: number = 100,
  ) {
    return await this.quizService.getLeaderboard(category as any, limit);
  }

  // ============= SPIN THE WHEEL =============
  @Post('spin')
  async spinWheel(@Req() req: RequestWithUser, @Query('type') wheelType: SpinWheelType = SpinWheelType.DAILY) {
    const userId = req.user?.id || 'demo-user';
    return await this.spinWheelService.spin(userId, wheelType);
  }

  @Get('spin/available')
  async checkSpinAvailability(@Req() req: RequestWithUser) {
    const userId = req.user?.id || 'demo-user';
    const canSpin = await this.spinWheelService.checkDailySpinAvailability(userId);
    return { available: canSpin };
  }

  @Post('spin/purchase')
  async purchaseExtraSpin(@Req() req: RequestWithUser, @Body() body: { tokenCost: number }) {
    const userId = req.user?.id || 'demo-user';
    await this.spinWheelService.purchaseExtraSpin(userId, body.tokenCost);
    return { success: true };
  }

  @Get('spin/history')
  async getSpinHistory(@Req() req: RequestWithUser, @Query('limit') limit: number = 50) {
    const userId = req.user?.id || 'demo-user';
    return await this.spinWheelService.getUserSpinHistory(userId, limit);
  }

  // ============= TREASURE HUNT =============
  @Get('treasure-hunt/active')
  async getActiveTreasureHunts() {
    return await this.treasureHuntService.getActiveHunts();
  }

  @Get('treasure-hunt/:huntId')
  async getTreasureHunt(@Param('huntId') huntId: string) {
    return await this.treasureHuntService.getHuntDetails(huntId);
  }

  @Post('treasure-hunt/:huntId/join')
  async joinTreasureHunt(@Req() req: RequestWithUser, @Param('huntId') huntId: string) {
    const userId = req.user?.id || 'demo-user';
    return await this.treasureHuntService.joinHunt(userId, huntId);
  }

  @Post('treasure-hunt/:huntId/find')
  async findTreasureLocation(
    @Req() req: RequestWithUser,
    @Param('huntId') huntId: string,
    @Body() body: { locationCode: string },
  ) {
    const userId = req.user?.id || 'demo-user';
    return await this.treasureHuntService.findLocation(userId, huntId, body.locationCode);
  }

  @Get('treasure-hunt/:huntId/progress')
  async getTreasureHuntProgress(@Req() req: RequestWithUser, @Param('huntId') huntId: string) {
    const userId = req.user?.id || 'demo-user';
    return await this.treasureHuntService.getUserProgress(userId, huntId);
  }

  @Get('treasure-hunt/:huntId/leaderboard')
  async getTreasureHuntLeaderboard(@Param('huntId') huntId: string) {
    return await this.treasureHuntService.getLeaderboard(huntId);
  }

  // ============= VIRTUAL PETS =============
  @Post('pets/adopt')
  async adoptPet(
    @Req() req: RequestWithUser,
    @Body() body: { name: string; species: PetSpecies },
  ) {
    const userId = req.user?.id || 'demo-user';
    return await this.virtualPetService.adoptPet(userId, body.name, body.species);
  }

  @Get('pets/my-pet')
  async getMyPet(@Req() req: RequestWithUser) {
    const userId = req.user?.id || 'demo-user';
    return await this.virtualPetService.getPet(userId);
  }

  @Post('pets/feed')
  async feedPet(@Req() req: RequestWithUser, @Body() body: { tokenAmount: number }) {
    const userId = req.user?.id || 'demo-user';
    return await this.virtualPetService.feedPet(userId, body.tokenAmount);
  }

  @Post('pets/play')
  async playWithPet(@Req() req: RequestWithUser) {
    const userId = req.user?.id || 'demo-user';
    return await this.virtualPetService.playWithPet(userId);
  }

  @Post('pets/battle/initiate')
  async initiatePetBattle(@Req() req: RequestWithUser, @Body() body: { opponentId: string }) {
    const userId = req.user?.id || 'demo-user';
    return await this.virtualPetService.initiateBattle(userId, body.opponentId);
  }

  @Post('pets/battle/:battleId/accept')
  async acceptPetBattle(@Req() req: RequestWithUser, @Param('battleId') battleId: string) {
    const userId = req.user?.id || 'demo-user';
    return await this.virtualPetService.acceptBattle(userId, battleId);
  }

  @Get('pets/battle/history')
  async getPetBattleHistory(@Req() req: RequestWithUser, @Query('limit') limit: number = 20) {
    const userId = req.user?.id || 'demo-user';
    return await this.virtualPetService.getBattleHistory(userId, limit);
  }

  @Get('pets/leaderboard')
  async getPetLeaderboard(@Query('limit') limit: number = 100) {
    return await this.virtualPetService.getPetLeaderboard(limit);
  }

  // ============= GUILDS =============
  @Get('guilds')
  async getGuilds(@Query('limit') limit: number = 50) {
    return await this.guildService.getGuilds(true, limit);
  }

  @Post('guilds/create')
  async createGuild(
    @Req() req: RequestWithUser,
    @Body() body: {
      name: string;
      tag: string;
      description: string;
      isPublic?: boolean;
    },
  ) {
    const userId = req.user?.id || 'demo-user';
    return await this.guildService.createGuild(
      userId,
      body.name,
      body.tag,
      body.description,
      body.isPublic,
    );
  }

  @Get('guilds/:guildId')
  async getGuild(@Param('guildId') guildId: string) {
    return await this.guildService.getGuild(guildId);
  }

  @Post('guilds/:guildId/join')
  async joinGuild(@Req() req: RequestWithUser, @Param('guildId') guildId: string) {
    const userId = req.user?.id || 'demo-user';
    return await this.guildService.joinGuild(userId, guildId);
  }

  @Post('guilds/:guildId/leave')
  async leaveGuild(@Req() req: RequestWithUser, @Param('guildId') guildId: string) {
    const userId = req.user?.id || 'demo-user';
    await this.guildService.leaveGuild(userId, guildId);
    return { success: true };
  }

  @Get('guilds/:guildId/members')
  async getGuildMembers(@Param('guildId') guildId: string) {
    return await this.guildService.getGuildMembers(guildId);
  }

  @Get('guilds/leaderboard')
  async getGuildLeaderboard(@Query('limit') limit: number = 100) {
    return await this.guildService.getGuildLeaderboard(limit);
  }

  @Get('guilds/my-guild')
  async getMyGuild(@Req() req: RequestWithUser) {
    const userId = req.user?.id || 'demo-user';
    return await this.guildService.getUserGuild(userId);
  }

  // ============= TOURNAMENTS =============
  @Get('tournaments/active')
  async getActiveTournaments() {
    return await this.tournamentService.getActiveTournaments();
  }

  @Get('tournaments/upcoming')
  async getUpcomingTournaments() {
    return await this.tournamentService.getUpcomingTournaments();
  }

  @Get('tournaments/:tournamentId')
  async getTournament(@Param('tournamentId') tournamentId: string) {
    return await this.tournamentService.getTournament(tournamentId);
  }

  @Post('tournaments/:tournamentId/join')
  async joinTournament(@Req() req: RequestWithUser, @Param('tournamentId') tournamentId: string) {
    const userId = req.user?.id || 'demo-user';
    return await this.tournamentService.joinTournament(userId, tournamentId);
  }

  @Get('tournaments/:tournamentId/leaderboard')
  async getTournamentLeaderboard(
    @Param('tournamentId') tournamentId: string,
    @Query('limit') limit: number = 100,
  ) {
    return await this.tournamentService.getLeaderboard(tournamentId, limit);
  }

  @Get('tournaments/my-tournaments')
  async getMyTournaments(@Req() req: RequestWithUser) {
    const userId = req.user?.id || 'demo-user';
    return await this.tournamentService.getUserTournaments(userId);
  }

  // ============= LEADERBOARDS =============
  @Get('leaderboards/:type')
  async getLeaderboard(
    @Param('type') type: LeaderboardType,
    @Query('period') period: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME,
    @Query('limit') limit: number = 100,
  ) {
    return await this.leaderboardService.getLeaderboard(type, period, limit);
  }

  @Get('leaderboards/:type/my-rank')
  async getMyRank(
    @Req() req: RequestWithUser,
    @Param('type') type: LeaderboardType,
    @Query('period') period: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME,
  ) {
    const userId = req.user?.id || 'demo-user';
    return await this.leaderboardService.getUserRank(userId, type, period);
  }
}
