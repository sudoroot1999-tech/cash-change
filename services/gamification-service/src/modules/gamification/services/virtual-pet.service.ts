import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualPet, PetSpecies, PetRarity, PetMood } from '../entities/virtual-pet.entity';
import { PetBattle, BattleStatus } from '../entities/pet-battle.entity';
import { LevelService } from './level.service';
import { XpSource } from '../entities/xp-transaction.entity';

@Injectable()
export class VirtualPetService {
  constructor(
    @InjectRepository(VirtualPet)
    private petRepository: Repository<VirtualPet>,
    @InjectRepository(PetBattle)
    private battleRepository: Repository<PetBattle>,
    private levelService: LevelService,
  ) {}

  async adoptPet(userId: string, name: string, species: PetSpecies): Promise<VirtualPet> {
    const existing = await this.petRepository.findOne({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('User already has a pet');
    }

    const pet = this.petRepository.create({
      userId,
      name,
      species,
      rarity: this.determineRarity(),
    });

    await this.petRepository.save(pet);
    await this.levelService.addXp(userId, 50, XpSource.PET_ADOPTED);

    return pet;
  }

  async getPet(userId: string): Promise<VirtualPet> {
    const pet = await this.petRepository.findOne({
      where: { userId },
    });

    if (!pet) {
      throw new NotFoundException('No pet found for this user');
    }

    // Update pet state based on time elapsed
    await this.updatePetState(pet);

    return pet;
  }

  async feedPet(userId: string, _tokenAmount: number): Promise<VirtualPet> {
    const pet = await this.getPet(userId);

    // Deduct tokens (integrate with wallet service)
    
    pet.hunger = Math.min(100, pet.hunger + 30);
    pet.happiness = Math.min(100, pet.happiness + 10);
    pet.health = Math.min(100, pet.health + 5);
    pet.lastFedAt = new Date();

    // Gain experience
    pet.experience += 10;
    await this.checkLevelUp(pet);

    return await this.petRepository.save(pet);
  }

  async playWithPet(userId: string): Promise<VirtualPet> {
    const pet = await this.getPet(userId);

    const now = new Date();
    if (pet.lastPlayedAt) {
      const hoursSincePlay = (now.getTime() - pet.lastPlayedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSincePlay < 1) {
        throw new BadRequestException('Pet needs rest before playing again');
      }
    }

    pet.happiness = Math.min(100, pet.happiness + 20);
    pet.hunger = Math.max(0, pet.hunger - 10);
    pet.lastPlayedAt = now;
    pet.experience += 5;

    await this.checkLevelUp(pet);

    return await this.petRepository.save(pet);
  }

  async initiateBattle(challengerId: string, opponentId: string): Promise<PetBattle> {
    const challengerPet = await this.getPet(challengerId);
    const opponentPet = await this.getPet(opponentId);

    if (challengerPet.health < 50 || challengerPet.happiness < 50) {
      throw new BadRequestException('Pet is not in good condition for battle');
    }

    const battle = this.battleRepository.create({
      challengerId,
      challengerPetId: challengerPet.id,
      opponentId,
      opponentPetId: opponentPet.id,
      status: BattleStatus.PENDING,
    });

    return await this.battleRepository.save(battle);
  }

  async acceptBattle(opponentId: string, battleId: string): Promise<PetBattle> {
    const battle = await this.battleRepository.findOne({
      where: { id: battleId, opponentId },
    });

    if (!battle) {
      throw new NotFoundException('Battle not found');
    }

    if (battle.status !== BattleStatus.PENDING) {
      throw new BadRequestException('Battle is not pending');
    }

    battle.status = BattleStatus.IN_PROGRESS;
    battle.startedAt = new Date();

    // Execute battle
    await this.executeBattle(battle);

    return battle;
  }

  private async executeBattle(battle: PetBattle): Promise<void> {
    const challengerPet = await this.petRepository.findOne({
      where: { id: battle.challengerPetId },
    });
    const opponentPet = await this.petRepository.findOne({
      where: { id: battle.opponentPetId },
    });

    if (!challengerPet || !opponentPet) {
      throw new NotFoundException('Pet not found');
    }

    const battleLog = [];

    // Calculate battle power
    const challengerPower = 
      challengerPet.strength * 1.5 + 
      challengerPet.intelligence + 
      challengerPet.luck * 0.5 +
      challengerPet.level * 2;

    const opponentPower = 
      opponentPet.strength * 1.5 + 
      opponentPet.intelligence + 
      opponentPet.luck * 0.5 +
      opponentPet.level * 2;

    // Add randomness
    const challengerRoll = challengerPower * (0.8 + Math.random() * 0.4);
    const opponentRoll = opponentPower * (0.8 + Math.random() * 0.4);

    battleLog.push({
      round: 1,
      challengerPower: challengerRoll,
      opponentPower: opponentRoll,
    });

    let winnerId: string;
    let loserPet: VirtualPet;
    let winnerPet: VirtualPet;

    if (challengerRoll > opponentRoll) {
      winnerId = battle.challengerId;
      winnerPet = challengerPet;
      loserPet = opponentPet;
    } else {
      winnerId = battle.opponentId;
      winnerPet = opponentPet;
      loserPet = challengerPet;
    }

    battle.winnerId = winnerId;
    battle.battleLog = battleLog;
    battle.status = BattleStatus.COMPLETED;
    battle.completedAt = new Date();
    battle.xpReward = 50;
    battle.tokenReward = 1;

    // Update pet stats
    winnerPet.totalBattles++;
    winnerPet.battlesWon++;
    winnerPet.experience += 50;
    await this.checkLevelUp(winnerPet);

    loserPet.totalBattles++;
    loserPet.battlesLost++;
    loserPet.experience += 10;
    await this.checkLevelUp(loserPet);

    await this.petRepository.save(winnerPet);
    await this.petRepository.save(loserPet);
    await this.battleRepository.save(battle);

    // Award XP to winner
    await this.levelService.addXp(winnerId, battle.xpReward, XpSource.PET_BATTLE_WON);
  }

  async getBattleHistory(userId: string, limit: number = 20) {
    return await this.battleRepository.find({
      where: [
        { challengerId: userId },
        { opponentId: userId },
      ],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getPetLeaderboard(limit: number = 100) {
    return await this.petRepository.find({
      order: {
        level: 'DESC',
        experience: 'DESC',
      },
      take: limit,
    });
  }

  private async updatePetState(pet: VirtualPet): Promise<void> {
    const now = new Date();

    // Decrease hunger over time
    if (pet.lastFedAt) {
      const hoursSinceFed = (now.getTime() - pet.lastFedAt.getTime()) / (1000 * 60 * 60);
      const hungerDecrease = Math.floor(hoursSinceFed * 2);
      pet.hunger = Math.max(0, pet.hunger - hungerDecrease);
    }

    // Decrease happiness over time
    if (pet.lastPlayedAt) {
      const hoursSincePlay = (now.getTime() - pet.lastPlayedAt.getTime()) / (1000 * 60 * 60);
      const happinessDecrease = Math.floor(hoursSincePlay);
      pet.happiness = Math.max(0, pet.happiness - happinessDecrease);
    }

    // Update mood
    if (pet.hunger < 20) {
      pet.mood = PetMood.HUNGRY;
    } else if (pet.happiness < 30) {
      pet.mood = PetMood.SAD;
    } else if (pet.happiness > 80 && pet.hunger > 80) {
      pet.mood = PetMood.EXCITED;
    } else if (pet.happiness > 60) {
      pet.mood = PetMood.HAPPY;
    } else {
      pet.mood = PetMood.NEUTRAL;
    }

    await this.petRepository.save(pet);
  }

  private async checkLevelUp(pet: VirtualPet): Promise<void> {
    while (pet.experience >= pet.experienceToNextLevel) {
      pet.level++;
      pet.experience -= pet.experienceToNextLevel;
      pet.experienceToNextLevel = Math.floor(pet.experienceToNextLevel * 1.5);

      // Increase stats
      pet.strength += Math.floor(Math.random() * 3) + 1;
      pet.intelligence += Math.floor(Math.random() * 3) + 1;
      pet.luck += Math.floor(Math.random() * 2) + 1;
      pet.health = 100;
      pet.happiness = 100;
    }
  }

  private determineRarity(): PetRarity {
    const random = Math.random() * 100;
    
    if (random < 0.5) return PetRarity.LEGENDARY;
    if (random < 5) return PetRarity.EPIC;
    if (random < 15) return PetRarity.RARE;
    if (random < 35) return PetRarity.UNCOMMON;
    return PetRarity.COMMON;
  }
}
