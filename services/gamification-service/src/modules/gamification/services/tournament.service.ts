import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Tournament, TournamentType, TournamentStatus } from '../entities/tournament.entity';
import { TournamentParticipant } from '../entities/tournament-participant.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LevelService } from './level.service';
import { RewardService } from './reward.service';
import { XpSource } from '../entities/xp-transaction.entity';

@Injectable()
export class TournamentService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private participantRepository: Repository<TournamentParticipant>,
    private levelService: LevelService,
    private rewardService: RewardService,
  ) {}

  async getActiveTournaments() {
    return await this.tournamentRepository.find({
      where: { status: TournamentStatus.ACTIVE },
      order: { startDate: 'ASC' },
    });
  }

  async getUpcomingTournaments() {
    return await this.tournamentRepository.find({
      where: { status: TournamentStatus.UPCOMING },
      order: { startDate: 'ASC' },
    });
  }

  async getTournament(tournamentId: string): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return tournament;
  }

  async joinTournament(userId: string, tournamentId: string): Promise<TournamentParticipant> {
    const tournament = await this.getTournament(tournamentId);

    if (tournament.status === TournamentStatus.COMPLETED) {
      throw new BadRequestException('Tournament has ended');
    }

    if (tournament.maxParticipants && tournament.currentParticipants >= tournament.maxParticipants) {
      throw new BadRequestException('Tournament is full');
    }

    const existing = await this.participantRepository.findOne({
      where: { userId, tournamentId },
    });

    if (existing) {
      return existing;
    }

    // Deduct entry fee if required
    if (tournament.entryFee > 0) {
      // Integrate with wallet service
      // await this.walletService.deductTokens(userId, tournament.entryFee);
    }

    const participant = this.participantRepository.create({
      userId,
      tournamentId,
      joinedAt: new Date(),
    });

    await this.participantRepository.save(participant);

    tournament.currentParticipants++;
    await this.tournamentRepository.save(tournament);

    return participant;
  }

  async updateParticipantScore(tournamentId: string, userId: string, score: number): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { userId, tournamentId },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.score += score;
    participant.gamesPlayed++;
    await this.participantRepository.save(participant);
  }

  async getLeaderboard(tournamentId: string, limit: number = 100) {
    return await this.participantRepository.find({
      where: { tournamentId },
      order: { score: 'DESC' },
      take: limit,
    });
  }

  async getUserTournaments(userId: string) {
    return await this.participantRepository.find({
      where: { userId },
      relations: ['tournament'],
      order: { joinedAt: 'DESC' },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateTournamentStatuses() {
    const now = new Date();

    // Start upcoming tournaments
    const toStart = await this.tournamentRepository.find({
      where: {
        status: TournamentStatus.UPCOMING,
        startDate: Between(new Date(0), now),
      },
    });

    for (const tournament of toStart) {
      tournament.status = TournamentStatus.ACTIVE;
      await this.tournamentRepository.save(tournament);
    }

    // End active tournaments
    const toEnd = await this.tournamentRepository.find({
      where: {
        status: TournamentStatus.ACTIVE,
        endDate: Between(new Date(0), now),
      },
    });

    for (const tournament of toEnd) {
      await this.endTournament(tournament.id);
    }
  }

  private async endTournament(tournamentId: string): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    tournament.status = TournamentStatus.COMPLETED;
    await this.tournamentRepository.save(tournament);

    // Calculate rankings
    const participants = await this.participantRepository.find({
      where: { tournamentId },
      order: { score: 'DESC' },
    });

    let rank = 1;
    for (const participant of participants) {
      participant.rank = rank++;
      
      // Award prizes based on rank
      const prize = this.calculatePrize(tournament.prizePool, participant.rank);
      if (prize) {
        participant.prizeWon = prize;
        await this.awardPrize(participant.userId, prize);
      }

      await this.participantRepository.save(participant);
    }
  }

  private calculatePrize(prizePool: Record<string, any>, rank: number): Record<string, any> | null {
    const prizes = prizePool.distribution || [];
    
    for (const prize of prizes) {
      if (rank >= prize.rankMin && rank <= prize.rankMax) {
        return prize.rewards;
      }
    }
    
    return null;
  }

  private async awardPrize(userId: string, prize: Record<string, any>): Promise<void> {
    if (prize.tokens) {
      await this.rewardService.createReward({
        userId,
        type: 'tokens',
        title: 'Tournament Prize',
        description: 'Tournament Prize',
        amount: prize.tokens,
        sourceType: 'tournament',
      });
    }

    if (prize.xp) {
      await this.levelService.addXp(userId, prize.xp, XpSource.TOURNAMENT_PRIZE);
    }

    if (prize.nft) {
      await this.rewardService.createReward({
        userId,
        type: 'nft',
        title: 'Tournament NFT Prize',
        description: 'Tournament Prize',
        amount: prize.nft,
        sourceType: 'tournament',
      });
    }

    if (prize.badge) {
      await this.rewardService.createReward({
        userId,
        type: 'badge',
        title: 'Tournament Badge',
        description: 'Tournament Prize',
        amount: prize.badge,
        sourceType: 'tournament',
      });
    }
  }

  async createTournament(tournamentData: Partial<Tournament>): Promise<Tournament> {
    const tournament = this.tournamentRepository.create(tournamentData);
    return await this.tournamentRepository.save(tournament);
  }
}
