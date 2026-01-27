import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follower, UserProfile } from '../../database/entities';
import { FollowerService } from './follower.service';
import { FollowerController } from './follower.controller';
import { FollowerResolver } from './follower.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Follower, UserProfile])],
  controllers: [FollowerController],
  providers: [FollowerService, FollowerResolver],
  exports: [FollowerService],
})
export class FollowerModule {}
