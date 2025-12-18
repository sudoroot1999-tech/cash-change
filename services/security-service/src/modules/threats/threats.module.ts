import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityEvent } from './entities/security-event.entity';
import { ThreatsService } from './threats.service';
import { ThreatsController } from './threats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SecurityEvent])],
  controllers: [ThreatsController],
  providers: [ThreatsService],
  exports: [ThreatsService],
})
export class ThreatsModule {}
