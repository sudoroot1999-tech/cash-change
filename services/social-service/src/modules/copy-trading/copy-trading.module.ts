import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CopyTradingRelationship, UserProfile } from '../../database/entities';
import { CopyTradingService } from './copy-trading.service';
import { CopyTradingController } from './copy-trading.controller';
import { CopyTradingResolver } from './copy-trading.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([CopyTradingRelationship, UserProfile])],
  controllers: [CopyTradingController],
  providers: [CopyTradingService, CopyTradingResolver],
  exports: [CopyTradingService],
})
export class CopyTradingModule {}
