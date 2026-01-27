import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from '../../entities';
import { DiscussionService } from './discussion.service';
import { DiscussionController } from './discussion.controller';
import { DiscussionResolver } from './discussion.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Discussion])],
  controllers: [DiscussionController],
  providers: [DiscussionService, DiscussionResolver],
  exports: [DiscussionService],
})
export class DiscussionModule {}
