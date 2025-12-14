import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradingPair } from './entities/pair.entity';
import { PairsService } from './pairs.service';
import { PairsController } from './pairs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TradingPair])],
  controllers: [PairsController],
  providers: [PairsService],
  exports: [PairsService],
})
export class PairsModule {}
