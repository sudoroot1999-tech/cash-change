import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NftAchievement, AchievementRarity } from '../entities/nft-achievement.entity';
import { UserAchievement } from '../entities/user-achievement.entity';

@Injectable()
export class GamificationService {
  constructor(
    @InjectRepository(NftAchievement)
    private achievementsRepository: Repository<NftAchievement>,
    @InjectRepository(UserAchievement)
    private userAchievementsRepository: Repository<UserAchievement>,
  ) {}

  async createAchievement(data: {
    name: string;
    description: string;
    achievementType: string;
    criteria: any;
    badgeImageUrl?: string;
    rarity?: string;
  }) {
    const achievement = this.achievementsRepository.create({
      ...data,
      rarity: data.rarity ? (data.rarity as AchievementRarity) : undefined,
    });
    return await this.achievementsRepository.save(achievement);
  }

  async awardAchievement(achievementId: string, userAddress: string, nftId?: string) {
    const userAchievement = this.userAchievementsRepository.create({
      achievementId,
      userAddress: userAddress.toLowerCase(),
      nftId,
    });

    return await this.userAchievementsRepository.save(userAchievement);
  }

  async getUserAchievements(userAddress: string) {
    return await this.userAchievementsRepository.find({
      where: { userAddress: userAddress.toLowerCase() },
      relations: ['achievement', 'nft'],
    });
  }

  async getAllAchievements() {
    return await this.achievementsRepository.find();
  }

  async checkAndAwardAchievements(_userAddress: string, _eventType: string, _data: any) {
    // Logic to check criteria and award achievements
    // Examples: First NFT minted, 10 NFTs traded, etc.
    // TODO: Implement achievement criteria checking logic
    return { message: 'Achievements checked' };
  }
}
