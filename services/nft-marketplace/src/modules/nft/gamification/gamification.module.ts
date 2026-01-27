import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { NftAchievement } from '../../../entities/nft-achievement.entity';
import { UserAchievement } from '../../../entities/user-achievement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NftAchievement, UserAchievement])],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
