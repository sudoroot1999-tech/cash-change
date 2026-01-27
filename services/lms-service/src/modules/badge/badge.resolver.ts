import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BadgeService } from './badge.service';
import { Badge, UserBadge, UserStats, BadgeCategory } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Resolver(() => Badge)
export class BadgeResolver {
  constructor(private readonly badgeService: BadgeService) {}

  @Query(() => [Badge], { name: 'badges' })
  async findAll(@Args('category', { type: () => String, nullable: true }) category?: BadgeCategory): Promise<Badge[]> {
    return this.badgeService.findAll(category);
  }

  @Query(() => Badge, { name: 'badge' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<Badge> {
    return this.badgeService.findOne(id);
  }

  @Query(() => [UserBadge], { name: 'myBadges' })
  @UseGuards(JwtAuthGuard)
  async getMyBadges(@CurrentUser('userId') userId: string): Promise<UserBadge[]> {
    return this.badgeService.getUserBadges(userId);
  }

  @Query(() => UserStats, { name: 'myStats' })
  @UseGuards(JwtAuthGuard)
  async getMyStats(@CurrentUser('userId') userId: string): Promise<UserStats> {
    return this.badgeService.getUserStats(userId);
  }

  @Query(() => [UserStats], { name: 'leaderboard' })
  async getLeaderboard(@Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number): Promise<UserStats[]> {
    return this.badgeService.getLeaderboard(limit);
  }

  @Mutation(() => UserBadge)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async awardBadge(
    @Args('userId') userId: string,
    @Args('badgeId', { type: () => ID }) badgeId: string,
  ): Promise<UserBadge> {
    return this.badgeService.awardBadge(userId, badgeId);
  }

  @Mutation(() => UserBadge)
  @UseGuards(JwtAuthGuard)
  async toggleBadgeDisplay(
    @Args('badgeId', { type: () => ID }) badgeId: string,
    @Args('display') display: boolean,
    @CurrentUser('userId') userId: string,
  ): Promise<UserBadge> {
    return this.badgeService.toggleBadgeDisplay(userId, badgeId, display);
  }
}
