import { Resolver, Query, Args, Int, ID, registerEnumType } from '@nestjs/graphql';
import { LeaderboardService, LeaderboardType, LeaderboardPeriod } from './leaderboard.service';
import { UserProfile } from '../../database/entities';
import { PaginationMeta } from '../../common/dto';
import { ObjectType, Field } from '@nestjs/graphql';

registerEnumType(LeaderboardType, { name: 'LeaderboardType' });
registerEnumType(LeaderboardPeriod, { name: 'LeaderboardPeriod' });

@ObjectType()
class RankedUser extends UserProfile {
  @Field(() => Int) rank: number;
}

@ObjectType()
class LeaderboardResult {
  @Field(() => [RankedUser]) items: RankedUser[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
  @Field(() => LeaderboardType) type: LeaderboardType;
  @Field(() => LeaderboardPeriod) period: LeaderboardPeriod;
}

@Resolver()
export class LeaderboardResolver {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Query(() => LeaderboardResult, { name: 'leaderboard' })
  getLeaderboard(
    @Args('type', { type: () => LeaderboardType, defaultValue: LeaderboardType.PNL }) type: LeaderboardType,
    @Args('period', { type: () => LeaderboardPeriod, defaultValue: LeaderboardPeriod.ALL_TIME }) period: LeaderboardPeriod,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 }) limit: number,
  ) {
    return this.leaderboardService.getLeaderboard(type, period, { page, limit });
  }

  @Query(() => Int, { name: 'userRank' })
  getUserRank(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('type', { type: () => LeaderboardType, defaultValue: LeaderboardType.PNL }) type: LeaderboardType,
  ) {
    return this.leaderboardService.getUserRank(userId, type);
  }

  @Query(() => [UserProfile], { name: 'topPerformers' })
  getTopPerformers(@Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number) {
    return this.leaderboardService.getTopPerformers(limit);
  }

  @Query(() => [UserProfile], { name: 'risingStars' })
  getRisingStars(@Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number) {
    return this.leaderboardService.getRisingStars(limit);
  }
}
