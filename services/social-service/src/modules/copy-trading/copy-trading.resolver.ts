import { Resolver, Query, Mutation, Args, ID, Int, Float } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CopyTradingService } from './copy-trading.service';
import { CopyTradingRelationship, UserProfile } from '../../database/entities';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { PaginationMeta } from '../../common/dto';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PaginatedCopyRelationships {
  @Field(() => [CopyTradingRelationship]) items: CopyTradingRelationship[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@ObjectType()
class PaginatedTraders {
  @Field(() => [UserProfile]) items: UserProfile[];
  @Field(() => PaginationMeta) meta: PaginationMeta;
}

@Resolver(() => CopyTradingRelationship)
export class CopyTradingResolver {
  constructor(private readonly copyTradingService: CopyTradingService) {}

  @Query(() => PaginatedCopyRelationships, { name: 'myCopying' })
  @UseGuards(JwtAuthGuard)
  getMyCopying(
    @CurrentUser('userId') userId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.copyTradingService.getMyCopying(userId, { page, limit });
  }

  @Query(() => PaginatedCopyRelationships, { name: 'myCopiers' })
  @UseGuards(JwtAuthGuard)
  getMyCopiers(
    @CurrentUser('userId') userId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.copyTradingService.getMyCopiers(userId, { page, limit });
  }

  @Query(() => CopyTradingRelationship, { name: 'copyRelationship', nullable: true })
  @UseGuards(JwtAuthGuard)
  getCopyRelationship(@CurrentUser('userId') copierId: string, @Args('traderId', { type: () => ID }) traderId: string) {
    return this.copyTradingService.getCopyRelationship(copierId, traderId);
  }

  @Query(() => PaginatedTraders, { name: 'topTradersForCopy' })
  getTopTraders(
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.copyTradingService.getTopTraders({ page, limit });
  }

  @Mutation(() => CopyTradingRelationship)
  @UseGuards(JwtAuthGuard)
  startCopyTrading(
    @CurrentUser('userId') copierId: string,
    @Args('traderId', { type: () => ID }) traderId: string,
    @Args('allocatedAmount', { type: () => Float }) allocatedAmount: number,
    @Args('copyRatio', { type: () => Float, nullable: true }) copyRatio?: number,
    @Args('maxDrawdown', { type: () => Float, nullable: true }) maxDrawdown?: number,
  ) {
    return this.copyTradingService.startCopying(copierId, traderId, { allocatedAmount, copyRatio, maxDrawdown });
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  stopCopyTrading(@CurrentUser('userId') copierId: string, @Args('traderId', { type: () => ID }) traderId: string) {
    return this.copyTradingService.stopCopying(copierId, traderId).then(() => true);
  }

  @Mutation(() => CopyTradingRelationship)
  @UseGuards(JwtAuthGuard)
  pauseCopyTrading(@CurrentUser('userId') copierId: string, @Args('traderId', { type: () => ID }) traderId: string) {
    return this.copyTradingService.pauseCopying(copierId, traderId);
  }

  @Mutation(() => CopyTradingRelationship)
  @UseGuards(JwtAuthGuard)
  resumeCopyTrading(@CurrentUser('userId') copierId: string, @Args('traderId', { type: () => ID }) traderId: string) {
    return this.copyTradingService.resumeCopying(copierId, traderId);
  }
}
