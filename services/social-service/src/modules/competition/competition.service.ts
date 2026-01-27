import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Competition, CompetitionStatus, CompetitionType, CompetitionParticipant } from '../../database/entities';
import { PaginationDto, createPaginationMeta } from '../../common/dto';

@Injectable()
export class CompetitionService {
  constructor(
    @InjectRepository(Competition)
    private competitionRepo: Repository<Competition>,
    @InjectRepository(CompetitionParticipant)
    private participantRepo: Repository<CompetitionParticipant>,
  ) {}

  async create(data: { title: string; description?: string; imageUrl?: string; type?: CompetitionType; startDate: Date; endDate: Date; entryFee?: number; prizePool?: number; prizeDistribution?: any; maxParticipants?: number; minBalance?: number; allowedPairs?: string[]; rules?: any; isPublic?: boolean }): Promise<Competition> {
    const competition = this.competitionRepo.create({ ...data, status: CompetitionStatus.DRAFT });
    return this.competitionRepo.save(competition);
  }

  async findById(id: string, userId?: string): Promise<Competition> {
    const competition = await this.competitionRepo.findOne({ where: { id } });
    if (!competition) throw new NotFoundException('Competition not found');
    if (userId) competition.isJoined = await this.isJoined(id, userId);
    return competition;
  }

  async getActiveCompetitions(pagination: PaginationDto, userId?: string) {
    const { page = 1, limit = 20 } = pagination;
    const [competitions, total] = await this.competitionRepo.findAndCount({
      where: { status: CompetitionStatus.ACTIVE, isPublic: true },
      take: limit,
      skip: (page - 1) * limit,
      order: { endDate: 'ASC' },
    });
    if (userId) for (const c of competitions) c.isJoined = await this.isJoined(c.id, userId);
    return { items: competitions, meta: createPaginationMeta(page, limit, total) };
  }

  async getUpcomingCompetitions(pagination: PaginationDto, userId?: string) {
    const { page = 1, limit = 20 } = pagination;
    const [competitions, total] = await this.competitionRepo.findAndCount({
      where: { status: CompetitionStatus.UPCOMING, isPublic: true },
      take: limit,
      skip: (page - 1) * limit,
      order: { startDate: 'ASC' },
    });
    if (userId) for (const c of competitions) c.isJoined = await this.isJoined(c.id, userId);
    return { items: competitions, meta: createPaginationMeta(page, limit, total) };
  }

  async join(competitionId: string, userId: string): Promise<CompetitionParticipant> {
    const competition = await this.findById(competitionId);
    if (![CompetitionStatus.UPCOMING, CompetitionStatus.ACTIVE].includes(competition.status)) {
      throw new BadRequestException('Cannot join this competition');
    }
    if (competition.maxParticipants && competition.participantsCount >= competition.maxParticipants) {
      throw new ConflictException('Competition is full');
    }

    const existing = await this.participantRepo.findOne({ where: { competitionId, userId } });
    if (existing) throw new ConflictException('Already joined');

    const participant = this.participantRepo.create({ competitionId, userId });
    const saved = await this.participantRepo.save(participant);
    await this.competitionRepo.increment({ id: competitionId }, 'participantsCount', 1);
    return saved;
  }

  async leave(competitionId: string, userId: string): Promise<void> {
    const competition = await this.findById(competitionId);
    if (competition.status === CompetitionStatus.ACTIVE) throw new ForbiddenException('Cannot leave active competition');

    const participant = await this.participantRepo.findOne({ where: { competitionId, userId } });
    if (!participant) throw new NotFoundException('Not a participant');

    await this.participantRepo.remove(participant);
    await this.competitionRepo.decrement({ id: competitionId }, 'participantsCount', 1);
  }

  async getLeaderboard(competitionId: string, pagination: PaginationDto) {
    const { page = 1, limit = 50 } = pagination;
    const [participants, total] = await this.participantRepo.findAndCount({
      where: { competitionId },
      relations: ['user'],
      take: limit,
      skip: (page - 1) * limit,
      order: { rank: 'ASC' },
    });
    return { items: participants, meta: createPaginationMeta(page, limit, total) };
  }

  async getMyCompetitions(userId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const [participations, total] = await this.participantRepo.findAndCount({
      where: { userId },
      relations: ['competition'],
      take: limit,
      skip: (page - 1) * limit,
      order: { joinedAt: 'DESC' },
    });
    return { items: participations.map((p) => ({ ...p.competition, isJoined: true, myStats: p })), meta: createPaginationMeta(page, limit, total) };
  }

  async updateParticipantStats(competitionId: string, userId: string, stats: { pnl?: number; roi?: number; winRate?: number; totalTrades?: number; winningTrades?: number; volume?: number }): Promise<void> {
    await this.participantRepo.update({ competitionId, userId }, stats);
  }

  async updateRankings(competitionId: string): Promise<void> {
    const competition = await this.findById(competitionId);
    const participants = await this.participantRepo.find({
      where: { competitionId },
      order: { score: 'DESC' },
    });

    for (let i = 0; i < participants.length; i++) {
      participants[i].rank = i + 1;
    }
    await this.participantRepo.save(participants);
  }

  private async isJoined(competitionId: string, userId: string): Promise<boolean> {
    const p = await this.participantRepo.findOne({ where: { competitionId, userId } });
    return !!p;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateCompetitionStatuses() {
    const now = new Date();
    await this.competitionRepo.update({ status: CompetitionStatus.UPCOMING, startDate: LessThan(now) }, { status: CompetitionStatus.ACTIVE });
    await this.competitionRepo.update({ status: CompetitionStatus.ACTIVE, endDate: LessThan(now) }, { status: CompetitionStatus.ENDED });
  }
}
