import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Leaderboard, LeaderboardType, LeaderboardPeriod } from '../entities/leaderboard.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Leaderboard)
    private leaderboardRepository: Repository<Leaderboard>,
  ) {}

  async getLeaderboard(
    type: LeaderboardType,
    period: LeaderboardPeriod,
    limit: number = 100,
  ) {
    const { periodStart, periodEnd } = this.getPeriodDates(period);

    return await this.leaderboardRepository.find({
      where: {
        type,
        period,
        periodStart: Between(periodStart, periodEnd),
      },
      order: { rank: 'ASC' },
      take: limit,
    });
  }

  async getUserRank(
    userId: string,
    type: LeaderboardType,
    period: LeaderboardPeriod,
  ): Promise<Leaderboard | null> {
    const { periodStart, periodEnd } = this.getPeriodDates(period);

    return await this.leaderboardRepository.findOne({
      where: {
        userId,
        type,
        period,
        periodStart: Between(periodStart, periodEnd),
      },
    });
  }

  async updateLeaderboard(
    type: LeaderboardType,
    period: LeaderboardPeriod,
    userId: string,
    score: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const { periodStart, periodEnd } = this.getPeriodDates(period);

    let entry = await this.leaderboardRepository.findOne({
      where: {
        userId,
        type,
        period,
        periodStart,
      },
    });

    if (entry) {
      entry.score = score;
      entry.metadata = metadata || entry.metadata;
    } else {
      entry = this.leaderboardRepository.create({
        type,
        period,
        userId,
        score,
        rank: 0,
        periodStart,
        periodEnd,
        metadata,
      });
    }

    await this.leaderboardRepository.save(entry);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async recalculateRanks() {
    const types = Object.values(LeaderboardType);
    const periods = Object.values(LeaderboardPeriod);

    for (const type of types) {
      for (const period of periods) {
        await this.recalculateRanksForPeriod(type, period);
      }
    }
  }

  private async recalculateRanksForPeriod(
    type: LeaderboardType,
    period: LeaderboardPeriod,
  ): Promise<void> {
    const { periodStart, periodEnd } = this.getPeriodDates(period);

    const entries = await this.leaderboardRepository.find({
      where: {
        type,
        period,
        periodStart: Between(periodStart, periodEnd),
      },
      order: { score: 'DESC' },
    });

    let rank = 1;
    for (const entry of entries) {
      const previousRank = entry.rank;
      entry.rank = rank;
      entry.previousRank = previousRank;
      entry.rankChange = previousRank > 0 ? previousRank - rank : 0;
      rank++;
    }

    await this.leaderboardRepository.save(entries);
  }

  private getPeriodDates(period: LeaderboardPeriod): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (period) {
      case LeaderboardPeriod.DAILY:
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 1);
        break;

      case LeaderboardPeriod.WEEKLY:
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - now.getDay());
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 7);
        break;

      case LeaderboardPeriod.MONTHLY:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;

      case LeaderboardPeriod.ALL_TIME:
        periodStart = new Date(0);
        periodEnd = new Date('2099-12-31');
        break;

      default:
        periodStart = new Date(0);
        periodEnd = new Date('2099-12-31');
    }

    return { periodStart, periodEnd };
  }

  async getTopGuilds(limit: number = 100) {
    return await this.leaderboardRepository.find({
      where: {
        type: LeaderboardType.GUILD,
        period: LeaderboardPeriod.MONTHLY,
      },
      order: { rank: 'ASC' },
      take: limit,
    });
  }
}
