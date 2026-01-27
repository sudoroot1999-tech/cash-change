import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CompetitionService } from './competition.service';
import { Competition, CompetitionParticipant } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationMeta } from '../../common/dto';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PaginatedCompetitions {
  @Field(() => [Competition]) items: Competition[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@ObjectType()
class PaginatedParticipants {
  @Field(() => [CompetitionParticipant]) items: CompetitionParticipant[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@Resolver(() => Competition)
export class CompetitionResolver {
  constructor(private readonly competitionService: CompetitionService) {}

  @Query(() => Competition, { name: 'competition' })
  getCompetition(@Args('id', { type: () => ID }) id: string, @CurrentUser('userId') userId?: string) {
    return this.competitionService.findById(id, userId);
  }

  @Query(() => PaginatedCompetitions, { name: 'activeCompetitions' })
  getActive(
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.competitionService.getActiveCompetitions({ page, limit }, userId);
  }

  @Query(() => PaginatedCompetitions, { name: 'upcomingCompetitions' })
  getUpcoming(
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.competitionService.getUpcomingCompetitions({ page, limit }, userId);
  }

  @Query(() => PaginatedParticipants, { name: 'competitionLeaderboard' })
  getLeaderboard(
    @Args('competitionId', { type: () => ID }) competitionId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 }) limit: number,
  ) {
    return this.competitionService.getLeaderboard(competitionId, { page, limit });
  }

  @Mutation(() => CompetitionParticipant)
  @UseGuards(JwtAuthGuard)
  joinCompetition(@Args('competitionId', { type: () => ID }) competitionId: string, @CurrentUser('userId') userId: string) {
    return this.competitionService.join(competitionId, userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  leaveCompetition(@Args('competitionId', { type: () => ID }) competitionId: string, @CurrentUser('userId') userId: string) {
    return this.competitionService.leave(competitionId, userId).then(() => true);
  }
}
