import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Competition, CompetitionParticipant } from '../../database/entities';
import { CompetitionService } from './competition.service';
import { CompetitionController } from './competition.controller';
import { CompetitionResolver } from './competition.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Competition, CompetitionParticipant])],
  controllers: [CompetitionController],
  providers: [CompetitionService, CompetitionResolver],
  exports: [CompetitionService],
})
export class CompetitionModule {}
