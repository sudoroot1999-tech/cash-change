import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Story, Like, Follower } from '../../database/entities';
import { StoryService } from './story.service';
import { StoryController } from './story.controller';
import { StoryResolver } from './story.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Story, Like, Follower])],
  controllers: [StoryController],
  providers: [StoryService, StoryResolver],
  exports: [StoryService],
})
export class StoryModule {}
