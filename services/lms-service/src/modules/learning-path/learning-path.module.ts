import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningPath, UserLearningPath } from '../../entities';
import { LearningPathService } from './learning-path.service';
import { LearningPathController } from './learning-path.controller';
import { LearningPathResolver } from './learning-path.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([LearningPath, UserLearningPath])],
  controllers: [LearningPathController],
  providers: [LearningPathService, LearningPathResolver],
  exports: [LearningPathService],
})
export class LearningPathModule {}
