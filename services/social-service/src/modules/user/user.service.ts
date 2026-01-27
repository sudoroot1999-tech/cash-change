import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UserProfile, UserStatus } from '../../database/entities';
import { CreateProfileDto, UpdateProfileDto } from './dto';
import { PaginationDto, createPaginationMeta } from '../../common/dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserProfile)
    private userProfileRepo: Repository<UserProfile>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async createProfile(userId: string, dto: CreateProfileDto): Promise<UserProfile> {
    const existing = await this.userProfileRepo.findOne({
      where: [{ userId }, { username: dto.username }],
    });

    if (existing) {
      if (existing.userId === userId) {
        throw new ConflictException('Profile already exists for this user');
      }
      throw new ConflictException('Username already taken');
    }

    const profile = this.userProfileRepo.create({
      userId,
      ...dto,
    });

    return this.userProfileRepo.save(profile);
  }

  async findByUserId(userId: string): Promise<UserProfile> {
    const cacheKey = `user:${userId}`;
    const cached = await this.cacheManager.get<UserProfile>(cacheKey);
    if (cached) return cached;

    const profile = await this.userProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    await this.cacheManager.set(cacheKey, profile, 300000);
    return profile;
  }

  async findByUsername(username: string): Promise<UserProfile> {
    const profile = await this.userProfileRepo.findOne({ where: { username } });
    if (!profile) {
      throw new NotFoundException('User profile not found');
    }
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const profile = await this.findByUserId(userId);
    Object.assign(profile, dto);
    const updated = await this.userProfileRepo.save(profile);
    await this.cacheManager.del(`user:${userId}`);
    return updated;
  }

  async searchUsers(query: string, pagination: PaginationDto, currentUserId?: string) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await this.userProfileRepo.findAndCount({
      where: [
        { username: ILike(`%${query}%`), status: UserStatus.ACTIVE },
        { displayName: ILike(`%${query}%`), status: UserStatus.ACTIVE },
      ],
      take: limit,
      skip,
      order: { followersCount: 'DESC' },
    });

    return {
      items: users,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getTopTraders(pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [traders, total] = await this.userProfileRepo.findAndCount({
      where: { isTrader: true, status: UserStatus.ACTIVE },
      take: limit,
      skip,
      order: { totalPnl: 'DESC' },
    });

    return {
      items: traders,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async getSuggestedUsers(userId: string, limit: number = 10): Promise<UserProfile[]> {
    return this.userProfileRepo
      .createQueryBuilder('user')
      .where('user.userId != :userId', { userId })
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('user.isPublic = true')
      .orderBy('user.followersCount', 'DESC')
      .take(limit)
      .getMany();
  }

  async updateLastActive(userId: string): Promise<void> {
    await this.userProfileRepo.update({ userId }, { lastActiveAt: new Date() });
  }

  async incrementCounter(
    userId: string,
    field: 'followersCount' | 'followingCount' | 'postsCount' | 'copiersCount',
    value: number = 1,
  ): Promise<void> {
    await this.userProfileRepo.increment({ userId }, field, value);
    await this.cacheManager.del(`user:${userId}`);
  }
}
