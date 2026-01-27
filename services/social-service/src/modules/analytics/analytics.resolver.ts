import { Resolver, Query, Args, ID, registerEnumType } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AnalyticsService, AnalyticsPeriod } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

registerEnumType(AnalyticsPeriod, { name: 'AnalyticsPeriod' });

@ObjectType()
class ProfileAnalytics {
  @Field(() => Int) totalFollowers: number;
  @Field(() => Int) totalFollowing: number;
  @Field(() => Int) totalPosts: number;
  @Field(() => Int) totalLikes: number;
  @Field(() => Int) totalComments: number;
  @Field(() => Int) newFollowers: number;
  @Field(() => Float) engagementRate: number;
}

@ObjectType()
class TradingAnalytics {
  @Field(() => Float) totalPnl: number;
  @Field(() => Float) winRate: number;
  @Field(() => Int) totalTrades: number;
  @Field(() => Int) winningTrades: number;
  @Field(() => Int) losingTrades: number;
  @Field(() => Float) avgProfit: number;
  @Field(() => Float) avgLoss: number;
  @Field(() => Float) riskScore: number;
}

@Resolver()
export class AnalyticsResolver {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Query(() => ProfileAnalytics, { name: 'myProfileAnalytics' })
  @UseGuards(JwtAuthGuard)
  getMyAnalytics(
    @CurrentUser('userId') userId: string,
    @Args('period', { type: () => AnalyticsPeriod, defaultValue: AnalyticsPeriod.MONTH }) period: AnalyticsPeriod,
  ) {
    return this.analyticsService.getProfileAnalytics(userId, period);
  }

  @Query(() => ProfileAnalytics, { name: 'userProfileAnalytics' })
  getUserAnalytics(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('period', { type: () => AnalyticsPeriod, defaultValue: AnalyticsPeriod.MONTH }) period: AnalyticsPeriod,
  ) {
    return this.analyticsService.getProfileAnalytics(userId, period);
  }

  @Query(() => TradingAnalytics, { name: 'myTradingAnalytics' })
  @UseGuards(JwtAuthGuard)
  getMyTradingAnalytics(
    @CurrentUser('userId') userId: string,
    @Args('period', { type: () => AnalyticsPeriod, defaultValue: AnalyticsPeriod.MONTH }) period: AnalyticsPeriod,
  ) {
    return this.analyticsService.getTradingAnalytics(userId, period);
  }
}
