import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UserProfile, UserStatus } from '../../database/entities';
import { PaginationDto, createPaginationMeta } from '../../common/dto';

export enum LeaderboardType {
  PNL = 'pnl',
  WIN_RATE = 'winRate',
  COPIERS = 'copiers',
  FOLLOWERS = 'followers',
}

export enum LeaderboardPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'all_time',
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(UserProfile)
    private userProfileRepo: Repository<UserProfile>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async getLeaderboard(type: LeaderboardType, period: LeaderboardPeriod, pagination: PaginationDto) {
    const cacheKey = `leaderboard:${type}:${period}:${pagination.page}:${pagination.limit}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const { page = 1, limit = 50 } = pagination;
    const orderField = this.getOrderField(type);

    const [users, total] = await this.userProfileRepo.findAndCount({
      where: { isTrader: true, status: UserStatus.ACTIVE },
      take: limit,
      skip: (page - 1) * limit,
      order: { [orderField]: 'DESC' },
    });

    const result = {
      items: users.map((u, i) => ({ ...u, rank: (page - 1) * limit + i + 1 })),
      meta: createPaginationMeta(page, limit, total),
      type,
      period,
    };

    await this.cacheManager.set(cacheKey, result, 60000); // 1 minute cache
    return result;
  }

  async getUserRank(userId: string, type: LeaderboardType): Promise<number> {
    const orderField = this.getOrderField(type);
    const user = await this.userProfileRepo.findOne({ where: { userId } });
    if (!user) return 0;

    const rank = await this.userProfileRepo
      .createQueryBuilder('u')
      .where('u.isTrader = true')
      .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere(`u.${orderField} > :value`, { value: user[orderField] })
      .getCount();

    return rank + 1;
  }

  async getTopPerformers(limit: number = 10) {
    return this.userProfileRepo.find({
      where: { isTrader: true, status: UserStatus.ACTIVE },
      take: limit,
      order: { totalPnl: 'DESC' },
    });
  }

  async getRisingStars(limit: number = 10) {
    // Users with high recent activity and good performance
    return this.userProfileRepo
      .createQueryBuilder('u')
      .where('u.isTrader = true')
      .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('u.createdAt > :date', { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) })
      .orderBy('u.followersCount', 'DESC')
      .take(limit)
      .getMany();
  }

  private getOrderField(type: LeaderboardType): string {
    switch (type) {
      case LeaderboardType.PNL: return 'totalPnl';
      case LeaderboardType.WIN_RATE: return 'winRate';
      case LeaderboardType.COPIERS: return 'copiersCount';
      case LeaderboardType.FOLLOWERS: return 'followersCount';
      default: return 'totalPnl';
    }
  }
}
