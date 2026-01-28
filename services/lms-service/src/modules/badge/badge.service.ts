import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge, UserBadge, UserStats, BadgeCategory } from '../../entities';

@Injectable()
export class BadgeService {
  constructor(
    @InjectRepository(Badge) private badgeRepository: Repository<Badge>,
    @InjectRepository(UserBadge) private userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(UserStats) private userStatsRepository: Repository<UserStats>,
  ) {}

  private generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  async create(createDto: any): Promise<Badge> {
    const slug = this.generateSlug(createDto.name);
    const badge = this.badgeRepository.create({ ...createDto, slug });
    return this.badgeRepository.save(badge);
  }

  async findAll(category?: BadgeCategory): Promise<Badge[]> {
    const where: any = { isActive: true };
    if (category) where.category = category;
    return this.badgeRepository.find({ where, order: { order: 'ASC' } });
  }

  async findOne(id: string): Promise<Badge> {
    const badge = await this.badgeRepository.findOne({ where: { id } });
    if (!badge) throw new NotFoundException(`Badge with ID ${id} not found`);
    return badge;
  }

  async update(id: string, updateDto: any): Promise<Badge> {
    const badge = await this.findOne(id);
    Object.assign(badge, updateDto);
    return this.badgeRepository.save(badge);
  }

  async remove(id: string): Promise<void> {
    const badge = await this.findOne(id);
    await this.badgeRepository.remove(badge);
  }

  async awardBadge(userId: string, badgeId: string, metadata?: any): Promise<UserBadge> {
    const existing = await this.userBadgeRepository.findOne({ where: { userId, badgeId } });
    if (existing) throw new ConflictException('Badge already awarded');
    const badge = await this.findOne(badgeId);
    const userBadge = this.userBadgeRepository.create({ userId, badgeId, metadata });
    await this.badgeRepository.increment({ id: badgeId }, 'earnedCount', 1);
    // Update user stats
    await this.userStatsRepository.increment({ userId }, 'badgesEarned', 1);
    await this.userStatsRepository.increment({ userId }, 'totalXP', badge.xpReward);
    return this.userBadgeRepository.save(userBadge);
  }

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    return this.userBadgeRepository.find({ where: { userId }, relations: ['badge'], order: { earnedAt: 'DESC' } });
  }

  async getUserStats(userId: string): Promise<UserStats> {
    let stats = await this.userStatsRepository.findOne({ where: { userId } });
    if (!stats) {
      stats = this.userStatsRepository.create({ userId });
      stats = await this.userStatsRepository.save(stats);
    }
    return stats;
  }

  async getLeaderboard(limit: number = 10): Promise<UserStats[]> {
    return this.userStatsRepository.find({ order: { totalXP: 'DESC' }, take: limit });
  }

  async toggleBadgeDisplay(userId: string, badgeId: string, display: boolean): Promise<UserBadge> {
    const userBadge = await this.userBadgeRepository.findOne({ where: { userId, badgeId } });
    if (!userBadge) throw new NotFoundException('Badge not found for user');
    userBadge.displayOnProfile = display;
    return this.userBadgeRepository.save(userBadge);
  }
}
