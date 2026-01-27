import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProgress } from '../../entities/user-progress.entity';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { ProgressResolver } from './progress.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([UserProgress])],
  controllers: [ProgressController],
  providers: [ProgressService, ProgressResolver],
  exports: [ProgressService],
})
export class ProgressModule {}
