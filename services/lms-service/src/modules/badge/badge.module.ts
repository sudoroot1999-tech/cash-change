import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Badge, UserBadge, UserStats } from '../../entities';
import { BadgeService } from './badge.service';
import { BadgeController } from './badge.controller';
import { BadgeResolver } from './badge.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Badge, UserBadge, UserStats])],
  controllers: [BadgeController],
  providers: [BadgeService, BadgeResolver],
  exports: [BadgeService],
})
export class BadgeModule {}
