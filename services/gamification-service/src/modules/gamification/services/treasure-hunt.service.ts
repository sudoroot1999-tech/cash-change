import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreasureHunt, TreasureHuntStatus } from '../entities/treasure-hunt.entity';
import { TreasureHuntParticipation } from '../entities/treasure-hunt-participation.entity';
import { LevelService } from './level.service';
import { RewardService } from './reward.service';
import { XpSource } from '../entities/xp-transaction.entity';

@Injectable()
export class TreasureHuntService {
  constructor(
    @InjectRepository(TreasureHunt)
    private huntRepository: Repository<TreasureHunt>,
    @InjectRepository(TreasureHuntParticipation)
    private participationRepository: Repository<TreasureHuntParticipation>,
    private levelService: LevelService,
    private rewardService: RewardService,
  ) {}

  async getActiveHunts() {
    return await this.huntRepository.find({
      where: { status: TreasureHuntStatus.ACTIVE },
      select: ['id', 'title', 'description', 'startDate', 'endDate', 'maxFinders', 'currentFinders', 'isSeasonal', 'season'],
    });
  }

  async getHuntDetails(huntId: string) {
    const hunt = await this.huntRepository.findOne({
      where: { id: huntId },
    });

    if (!hunt) {
      throw new NotFoundException('Treasure hunt not found');
    }

    // Return only released clues
    const now = new Date();
    const releasedClues = hunt.clues.filter((clue: any) => new Date(clue.releaseTime) <= now);

    return {
      id: hunt.id,
      title: hunt.title,
      description: hunt.description,
      clues: releasedClues.map((c: any) => ({ id: c.id, text: c.text, hint: c.hint })),
      maxFinders: hunt.maxFinders,
      currentFinders: hunt.currentFinders,
      startDate: hunt.startDate,
      endDate: hunt.endDate,
    };
  }

  async joinHunt(userId: string, huntId: string) {
    const hunt = await this.huntRepository.findOne({
      where: { id: huntId },
    });

    if (!hunt) {
      throw new NotFoundException('Treasure hunt not found');
    }

    if (hunt.status !== TreasureHuntStatus.ACTIVE) {
      throw new BadRequestException('Treasure hunt is not active');
    }

    const existing = await this.participationRepository.findOne({
      where: { userId, huntId },
    });

    if (existing) {
      return existing;
    }

    const participation = this.participationRepository.create({
      userId,
      huntId,
      cluesUnlocked: [],
      locationsFound: [],
    });

    return await this.participationRepository.save(participation);
  }

  async findLocation(userId: string, huntId: string, locationCode: string) {
    const hunt = await this.huntRepository.findOne({
      where: { id: huntId },
    });

    if (!hunt) {
      throw new NotFoundException('Treasure hunt not found');
    }

    const participation = await this.participationRepository.findOne({
      where: { userId, huntId },
    });

    if (!participation) {
      throw new BadRequestException('You have not joined this hunt');
    }

    if (participation.isCompleted) {
      throw new BadRequestException('You have already completed this hunt');
    }

    // Verify location code
    const location = hunt.locations.find((loc: string) => loc === locationCode);
    
    if (!location) {
      throw new BadRequestException('Invalid location code');
    }

    if (participation.locationsFound.includes(locationCode)) {
      throw new BadRequestException('Location already found');
    }

    participation.locationsFound.push(locationCode);

    // Check if all locations found
    if (participation.locationsFound.length === hunt.locations.length) {
      participation.isCompleted = true;
      participation.foundAt = new Date();

      // Check if first finder
      if (hunt.currentFinders === 0) {
        participation.isFirstFinder = true;
        participation.rewardsClaimed = hunt.firstFinderBonus;
        
        // Award first finder bonus
        await this.awardRewards(userId, hunt.firstFinderBonus);
      } else {
        participation.rewardsClaimed = hunt.totalRewards;
        await this.awardRewards(userId, hunt.totalRewards);
      }

      hunt.currentFinders++;
      
      // Check if max finders reached
      if (hunt.currentFinders >= hunt.maxFinders) {
        hunt.status = TreasureHuntStatus.COMPLETED;
      }
      
      await this.huntRepository.save(hunt);

      // Award completion XP
      await this.levelService.addXp(userId, 200, XpSource.TREASURE_HUNT_COMPLETED);
    }

    return await this.participationRepository.save(participation);
  }

  async getUserProgress(userId: string, huntId: string) {
    const participation = await this.participationRepository.findOne({
      where: { userId, huntId },
      relations: ['hunt'],
    });

    if (!participation) {
      return null;
    }

    return {
      locationsFound: participation.locationsFound.length,
      totalLocations: participation.hunt.locations.length,
      isCompleted: participation.isCompleted,
      isFirstFinder: participation.isFirstFinder,
      rewards: participation.rewardsClaimed,
      foundAt: participation.foundAt,
    };
  }

  async getLeaderboard(huntId: string) {
    return await this.participationRepository.find({
      where: {
        huntId,
        isCompleted: true,
      },
      order: { foundAt: 'ASC' },
      take: 100,
    });
  }

  async createHunt(huntData: Partial<TreasureHunt>): Promise<TreasureHunt> {
    const hunt = this.huntRepository.create(huntData);
    return await this.huntRepository.save(hunt);
  }

  private async awardRewards(userId: string, rewards: Record<string, any>) {
    if (rewards.tokens) {
      await this.rewardService.createReward({
        userId,
        type: 'tokens',
        title: 'Treasure Hunt Reward',
        description: 'Treasure Hunt',
        amount: rewards.tokens,
        sourceType: 'treasure_hunt',
      });
    }

    if (rewards.xp) {
      await this.levelService.addXp(userId, rewards.xp, XpSource.TREASURE_HUNT_REWARD);
    }

    if (rewards.nft) {
      await this.rewardService.createReward({
        userId,
        type: 'nft',
        title: 'Treasure Hunt NFT',
        description: 'Treasure Hunt',
        amount: rewards.nft,
        sourceType: 'treasure_hunt',
      });
    }
  }
}
