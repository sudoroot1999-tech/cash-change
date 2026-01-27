import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LevelService } from './services/level.service';
import { BadgeService } from './services/badge.service';
import { MissionService } from './services/mission.service';
import { ChallengeService } from './services/challenge.service';
import { RewardService } from './services/reward.service';
import { MiniGameService } from './services/mini-game.service';
import { LoginStreakService } from './services/login-streak.service';
import { FraudDetectionService } from './services/fraud-detection.service';
import { AddXpDto } from './dto/add-xp.dto';
import { ClaimMissionDto } from './dto/claim-mission.dto';
import { JoinChallengeDto } from './dto/join-challenge.dto';
import { PricePredictionDto } from './dto/price-prediction.dto';
import { PlaySpinWheelDto } from './dto/play-spin-wheel.dto';
import { UpdateMissionProgressDto } from './dto/update-mission-progress.dto';

@ApiTags('gamification')
@Controller('gamification')
@ApiBearerAuth()
export class GamificationController {
  constructor(
    private readonly levelService: LevelService,
    private readonly badgeService: BadgeService,
    private readonly missionService: MissionService,
    private readonly challengeService: ChallengeService,
    private readonly rewardService: RewardService,
    private readonly miniGameService: MiniGameService,
    private readonly loginStreakService: LoginStreakService,
    private readonly fraudDetectionService: FraudDetectionService,
  ) {}

  // Profile & Level Endpoints
  @Get('profile')
  @ApiOperation({ summary: 'Get user gamification profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@Request() req) {
    const userId = req.user?.userId || 'demo-user';

    const [userLevel, badges, streak, rewardStats] = await Promise.all([
      this.levelService.getUserLevel(userId),
      this.badgeService.getUserBadges(userId),
      this.loginStreakService.getLoginStreak(userId),
      this.rewardService.getRewardStats(userId),
    ]);

    return {
      level: userLevel,
      badges: badges.length,
      badgesList: badges,
      streak,
      rewards: rewardStats,
    };
  }

  @Post('xp/add')
  @ApiOperation({ summary: 'Add XP to user (internal use)' })
  @ApiResponse({ status: 201, description: 'XP added successfully' })
  async addXp(@Body() addXpDto: AddXpDto) {
    return this.levelService.addXp(
      addXpDto.userId,
      addXpDto.amount,
      addXpDto.source,
      addXpDto.sourceId,
      addXpDto.description,
      addXpDto.metadata,
    );
  }

  @Get('xp/transactions')
  @ApiOperation({ summary: 'Get XP transaction history' })
  @ApiResponse({ status: 200, description: 'XP transactions retrieved' })
  async getXpTransactions(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const userId = req.user?.userId || 'demo-user';
    return this.levelService.getXpTransactions(userId, limit, offset);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get global leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved' })
  async getLeaderboard(@Query('limit') limit?: number) {
    return this.levelService.getLeaderboard(limit);
  }

  // Badge Endpoints
  @Get('badges')
  @ApiOperation({ summary: 'Get all available badges' })
  @ApiResponse({ status: 200, description: 'Badges retrieved' })
  async getAllBadges() {
    return this.badgeService.getAllBadges();
  }

  @Get('badges/user')
  @ApiOperation({ summary: 'Get user badges' })
  @ApiResponse({ status: 200, description: 'User badges retrieved' })
  async getUserBadges(@Request() req) {
    const userId = req.user?.userId || 'demo-user';
    return this.badgeService.getUserBadges(userId);
  }

  // Mission Endpoints
  @Get('missions/daily')
  @ApiOperation({ summary: 'Get daily missions' })
  @ApiResponse({ status: 200, description: 'Daily missions retrieved' })
  async getDailyMissions(@Request() req) {
    const userId = req.user?.userId || 'demo-user';
    return this.missionService.getDailyMissions(userId);
  }

  @Post('missions/progress')
  @ApiOperation({ summary: 'Update mission progress' })
  @ApiResponse({ status: 200, description: 'Mission progress updated' })
  async updateMissionProgress(@Body() dto: UpdateMissionProgressDto) {
    return this.missionService.updateMissionProgress(
      dto.userId,
      dto.missionCode,
      dto.progressAmount,
    );
  }

  @Post('missions/claim')
  @ApiOperation({ summary: 'Claim completed mission rewards' })
  @ApiResponse({ status: 200, description: 'Mission claimed successfully' })
  async claimMission(@Request() req, @Body() dto: ClaimMissionDto) {
    const userId = req.user?.userId || 'demo-user';
    return this.missionService.claimMission(userId, dto.missionId);
  }

  // Challenge Endpoints
  @Get('challenges')
  @ApiOperation({ summary: 'Get active challenges' })
  @ApiResponse({ status: 200, description: 'Challenges retrieved' })
  async getActiveChallenges() {
    return this.challengeService.getActiveChallenges();
  }

  @Get('challenges/upcoming')
  @ApiOperation({ summary: 'Get upcoming challenges' })
  @ApiResponse({ status: 200, description: 'Upcoming challenges retrieved' })
  async getUpcomingChallenges() {
    return this.challengeService.getUpcomingChallenges();
  }

  @Get('challenges/:id')
  @ApiOperation({ summary: 'Get challenge by ID' })
  @ApiResponse({ status: 200, description: 'Challenge retrieved' })
  async getChallengeById(@Param('id') id: string) {
    return this.challengeService.getChallengeById(id);
  }

  @Post('challenges/join')
  @ApiOperation({ summary: 'Join a challenge' })
  @ApiResponse({ status: 201, description: 'Joined challenge successfully' })
  async joinChallenge(@Request() req, @Body() dto: JoinChallengeDto) {
    const userId = req.user?.userId || 'demo-user';
    return this.challengeService.joinChallenge(userId, dto.challengeId, dto.teamId);
  }

  @Get('challenges/:id/leaderboard')
  @ApiOperation({ summary: 'Get challenge leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved' })
  async getChallengeLeaderboard(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.challengeService.getLeaderboard(id, limit);
  }

  @Get('challenges/user/my')
  @ApiOperation({ summary: 'Get user challenges' })
  @ApiResponse({ status: 200, description: 'User challenges retrieved' })
  async getUserChallenges(@Request() req) {
    const userId = req.user?.userId || 'demo-user';
    return this.challengeService.getUserChallenges(userId);
  }

  // Reward Endpoints
  @Get('rewards')
  @ApiOperation({ summary: 'Get user rewards' })
  @ApiResponse({ status: 200, description: 'Rewards retrieved' })
  async getUserRewards(@Request() req, @Query('status') status?: string) {
    const userId = req.user?.userId || 'demo-user';
    return this.rewardService.getUserRewards(userId, status as any);
  }

  @Get('rewards/pending')
  @ApiOperation({ summary: 'Get pending rewards' })
  @ApiResponse({ status: 200, description: 'Pending rewards retrieved' })
  async getPendingRewards(@Request() req) {
    const userId = req.user?.userId || 'demo-user';
    return this.rewardService.getPendingRewards(userId);
  }

  @Post('rewards/:id/claim')
  @ApiOperation({ summary: 'Claim a reward' })
  @ApiResponse({ status: 200, description: 'Reward claimed successfully' })
  async claimReward(@Request() req, @Param('id') id: string) {
    const userId = req.user?.userId || 'demo-user';
    return this.rewardService.claimReward(userId, id);
  }

  // Mini-Game Endpoints
  @Post('mini-game/predict')
  @ApiOperation({ summary: 'Play price prediction game' })
  @ApiResponse({ status: 201, description: 'Price prediction started' })
  async playPricePrediction(@Request() req, @Body() dto: PricePredictionDto) {
    const userId = req.user?.userId || 'demo-user';
    return this.miniGameService.playPricePrediction(
      userId,
      dto.symbol,
      dto.direction,
      dto.timeWindowMinutes,
    );
  }

  @Post('mini-game/spin')
  @ApiOperation({ summary: 'Spin the wheel' })
  @ApiResponse({ status: 201, description: 'Wheel spun successfully' })
  async playSpinWheel(@Request() req, @Body() dto: PlaySpinWheelDto) {
    const userId = req.user?.userId || 'demo-user';
    return this.miniGameService.playSpinWheel(userId, dto.spinType);
  }

  @Post('mini-game/quiz')
  @ApiOperation({ summary: 'Play quiz game' })
  @ApiResponse({ status: 201, description: 'Quiz completed' })
  async playQuiz(
    @Request() req,
    @Body() body: { questions: Array<{ id: string; answer: string }> },
  ) {
    const userId = req.user?.userId || 'demo-user';
    return this.miniGameService.playQuiz(userId, body.questions);
  }

  @Get('mini-game/history')
  @ApiOperation({ summary: 'Get mini-game history' })
  @ApiResponse({ status: 200, description: 'Game history retrieved' })
  async getGameHistory(
    @Request() req,
    @Query('gameType') gameType?: string,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user?.userId || 'demo-user';
    return this.miniGameService.getUserGameHistory(userId, gameType as any, limit);
  }

  @Get('mini-game/stats')
  @ApiOperation({ summary: 'Get mini-game statistics' })
  @ApiResponse({ status: 200, description: 'Game stats retrieved' })
  async getGameStats(@Request() req) {
    const userId = req.user?.userId || 'demo-user';
    return this.miniGameService.getGameStats(userId);
  }

  // Login Streak Endpoints
  @Post('streak/record')
  @ApiOperation({ summary: 'Record user login' })
  @ApiResponse({ status: 200, description: 'Login recorded' })
  async recordLogin(@Request() req) {
    const userId = req.user?.userId || 'demo-user';
    return this.loginStreakService.recordLogin(userId);
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get login streak' })
  @ApiResponse({ status: 200, description: 'Streak retrieved' })
  async getLoginStreak(@Request() req) {
    const userId = req.user?.userId || 'demo-user';
    return this.loginStreakService.getLoginStreak(userId);
  }

  // Fraud Detection Endpoints (Admin)
  @Get('fraud/alerts')
  @ApiOperation({ summary: 'Get fraud alerts (admin)' })
  @ApiResponse({ status: 200, description: 'Fraud alerts retrieved' })
  async getFraudAlerts(
    @Query('userId') userId?: string,
    @Query('resolved') resolved?: boolean,
    @Query('limit') limit?: number,
  ) {
    return this.fraudDetectionService.getFraudAlerts(userId, resolved, limit);
  }

  @Get('fraud/risk/:userId')
  @ApiOperation({ summary: 'Get user risk score (admin)' })
  @ApiResponse({ status: 200, description: 'Risk score retrieved' })
  async getUserRiskScore(@Param('userId') userId: string) {
    const riskScore = await this.fraudDetectionService.getUserRiskScore(userId);
    return { userId, riskScore };
  }
}
