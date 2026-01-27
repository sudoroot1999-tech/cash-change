import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from '../../database/entities';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardResolver } from './leaderboard.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfile])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService, LeaderboardResolver],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
