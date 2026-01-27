import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Challenge, ChallengeStatus, ChallengeType } from '../entities/challenge.entity';
import { ChallengeParticipant } from '../entities/challenge-participant.entity';
import { RewardService } from './reward.service';

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);

  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepository: Repository<Challenge>,
    @InjectRepository(ChallengeParticipant)
    private readonly participantRepository: Repository<ChallengeParticipant>,
    private readonly rewardService: RewardService,
  ) {}

  async getActiveChallenges(): Promise<Challenge[]> {
    return this.challengeRepository.find({
      where: { status: ChallengeStatus.ACTIVE },
      order: { startDate: 'DESC' },
    });
  }

  async getUpcomingChallenges(): Promise<Challenge[]> {
    return this.challengeRepository.find({
      where: { status: ChallengeStatus.UPCOMING },
      order: { startDate: 'ASC' },
    });
  }

  async getChallengeById(challengeId: string): Promise<Challenge> {
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    return challenge;
  }

  async joinChallenge(
    userId: string,
    challengeId: string,
    teamId?: string,
  ): Promise<ChallengeParticipant> {
    const challenge = await this.getChallengeById(challengeId);

    if (challenge.status !== ChallengeStatus.ACTIVE) {
      throw new BadRequestException('Challenge is not active');
    }

    // Check if user already joined
    const existing = await this.participantRepository.findOne({
      where: { userId, challengeId },
    });

    if (existing) {
      throw new BadRequestException('Already joined this challenge');
    }

    // Check max participants
    if (challenge.maxParticipants) {
      const participantCount = await this.participantRepository.count({
        where: { challengeId },
      });

      if (participantCount >= challenge.maxParticipants) {
        throw new BadRequestException('Challenge is full');
      }
    }

    // Create participant
    const participant = this.participantRepository.create({
      challengeId,
      userId,
      teamId,
      score: 0,
      joinedAt: new Date(),
    });

    return this.participantRepository.save(participant);
  }

  async updateParticipantScore(
    userId: string,
    challengeId: string,
    score: number,
    stats?: Record<string, any>,
  ): Promise<ChallengeParticipant> {
    const participant = await this.participantRepository.findOne({
      where: { userId, challengeId },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (participant.isDisqualified) {
      throw new BadRequestException('Participant is disqualified');
    }

    participant.score = score;
    if (stats) {
      participant.stats = { ...participant.stats, ...stats };
    }

    return this.participantRepository.save(participant);
  }

  async getLeaderboard(
    challengeId: string,
    limit: number = 100,
  ): Promise<ChallengeParticipant[]> {
    const participants = await this.participantRepository.find({
      where: { challengeId, isDisqualified: false },
      order: { score: 'DESC' },
      take: limit,
    });

    // Update ranks
    participants.forEach((participant, index) => {
      participant.rank = index + 1;
    });

    await this.participantRepository.save(participants);

    return participants;
  }

  async getUserChallenges(userId: string): Promise<ChallengeParticipant[]> {
    return this.participantRepository.find({
      where: { userId },
      relations: ['challenge'],
      order: { joinedAt: 'DESC' },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateChallengeStatuses(): Promise<void> {
    const now = new Date();

    // Start upcoming challenges
    await this.challengeRepository
      .createQueryBuilder()
      .update()
      .set({ status: ChallengeStatus.ACTIVE })
      .where('status = :status', { status: ChallengeStatus.UPCOMING })
      .andWhere('startDate <= :now', { now })
      .execute();

    // End active challenges
    const endedChallenges = await this.challengeRepository.find({
      where: { status: ChallengeStatus.ACTIVE },
    });

    for (const challenge of endedChallenges) {
      if (challenge.endDate <= now) {
        await this.endChallenge(challenge.id);
      }
    }
  }

  private async endChallenge(challengeId: string): Promise<void> {
    const challenge = await this.getChallengeById(challengeId);
    
    challenge.status = ChallengeStatus.ENDED;
    await this.challengeRepository.save(challenge);

    // Calculate final leaderboard
    const leaderboard = await this.getLeaderboard(challengeId);

    // Distribute rewards
    await this.distributeRewards(challenge, leaderboard);

    this.logger.log(`Challenge ${challengeId} ended`);
  }

  private async distributeRewards(
    challenge: Challenge,
    leaderboard: ChallengeParticipant[],
  ): Promise<void> {
    const rewards = challenge.rewards as any;

    if (!rewards || !rewards.distribution) return;

    for (const [rank, rewardData] of Object.entries(rewards.distribution)) {
      const rankNumber = parseInt(rank);
      const participant = leaderboard.find(p => p.rank === rankNumber);

      if (participant) {
        const reward = rewardData as any;
        
        await this.rewardService.createReward({
          userId: participant.userId,
          type: reward.type || 'TOKEN',
          title: `${challenge.title} - Rank ${rankNumber} Reward`,
          description: `Congratulations on finishing rank ${rankNumber}!`,
          amount: reward.amount,
          sourceType: 'challenge',
          sourceId: challenge.id,
          metadata: {
            rank: rankNumber,
            score: participant.score,
          },
        });

        this.logger.log(
          `Reward distributed to user ${participant.userId} for challenge ${challenge.id}`,
        );
      }
    }
  }

  async disqualifyParticipant(
    challengeId: string,
    userId: string,
    reason: string,
  ): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { userId, challengeId },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.isDisqualified = true;
    participant.disqualificationReason = reason;
    await this.participantRepository.save(participant);

    this.logger.log(`User ${userId} disqualified from challenge ${challengeId}: ${reason}`);
  }
}
