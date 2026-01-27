import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamificationController } from './gamification.controller';
import { GamesController } from './controllers/games.controller';
import { UserLevel } from './entities/user-level.entity';
import { XpTransaction } from './entities/xp-transaction.entity';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { Mission } from './entities/mission.entity';
import { UserMission } from './entities/user-mission.entity';
import { Challenge } from './entities/challenge.entity';
import { ChallengeParticipant } from './entities/challenge-participant.entity';
import { Reward } from './entities/reward.entity';
import { MiniGame } from './entities/mini-game.entity';
import { LoginStreak } from './entities/login-streak.entity';
import { FraudDetection } from './entities/fraud-detection.entity';
import { PricePrediction } from './entities/price-prediction.entity';
import { TradingSimulator } from './entities/trading-simulator.entity';
import { SimulatorTrade } from './entities/simulator-trade.entity';
import { Quiz } from './entities/quiz.entity';
import { QuizSession } from './entities/quiz-session.entity';
import { SpinWheel } from './entities/spin-wheel.entity';
import { DailySpin } from './entities/daily-spin.entity';
import { TreasureHunt } from './entities/treasure-hunt.entity';
import { TreasureHuntParticipation } from './entities/treasure-hunt-participation.entity';
import { VirtualPet } from './entities/virtual-pet.entity';
import { PetBattle } from './entities/pet-battle.entity';
import { Guild } from './entities/guild.entity';
import { GuildMember } from './entities/guild-member.entity';
import { Tournament } from './entities/tournament.entity';
import { TournamentParticipant } from './entities/tournament-participant.entity';
import { SeasonalEvent } from './entities/seasonal-event.entity';
import { Leaderboard } from './entities/leaderboard.entity';
import { LevelService } from './services/level.service';
import { BadgeService } from './services/badge.service';
import { MissionService } from './services/mission.service';
import { ChallengeService } from './services/challenge.service';
import { RewardService } from './services/reward.service';
import { MiniGameService } from './services/mini-game.service';
import { LoginStreakService } from './services/login-streak.service';
import { FraudDetectionService } from './services/fraud-detection.service';
import { PricePredictionService } from './services/price-prediction.service';
import { TradingSimulatorService } from './services/trading-simulator.service';
import { QuizService } from './services/quiz.service';
import { SpinWheelService } from './services/spin-wheel.service';
import { TreasureHuntService } from './services/treasure-hunt.service';
import { VirtualPetService } from './services/virtual-pet.service';
import { GuildService } from './services/guild.service';
import { TournamentService } from './services/tournament.service';
import { LeaderboardService } from './services/leaderboard.service';
import { SeasonalEventService } from './services/seasonal-event.service';
import { GamificationEventsService } from './services/gamification-events.service';
import { TradingEventsConsumer } from './consumers/trading-events.consumer';
import { AuthEventsConsumer } from './consumers/auth-events.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserLevel,
      XpTransaction,
      Badge,
      UserBadge,
      Mission,
      UserMission,
      Challenge,
      ChallengeParticipant,
      Reward,
      MiniGame,
      LoginStreak,
      FraudDetection,
      PricePrediction,
      TradingSimulator,
      SimulatorTrade,
      Quiz,
      QuizSession,
      SpinWheel,
      DailySpin,
      TreasureHunt,
      TreasureHuntParticipation,
      VirtualPet,
      PetBattle,
      Guild,
      GuildMember,
      Tournament,
      TournamentParticipant,
      SeasonalEvent,
      Leaderboard,
    ]),
  ],
  controllers: [GamificationController, GamesController],
  providers: [
    LevelService,
    BadgeService,
    MissionService,
    ChallengeService,
    RewardService,
    MiniGameService,
    LoginStreakService,
    FraudDetectionService,
    PricePredictionService,
    TradingSimulatorService,
    QuizService,
    SpinWheelService,
    TreasureHuntService,
    VirtualPetService,
    GuildService,
    TournamentService,
    LeaderboardService,
    SeasonalEventService,
    GamificationEventsService,
    // Event Consumers
    TradingEventsConsumer,
    AuthEventsConsumer,
  ],
  exports: [
    LevelService,
    BadgeService,
    MissionService,
    RewardService,
    FraudDetectionService,
  ],
})
export class GamificationModule {}
