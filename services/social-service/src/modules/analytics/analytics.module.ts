import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile, Post, CopyTradingRelationship } from '../../entities';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsResolver } from './analytics.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfile, Post, CopyTradingRelationship])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsResolver],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
