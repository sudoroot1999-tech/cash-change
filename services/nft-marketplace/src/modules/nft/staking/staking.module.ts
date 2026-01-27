import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StakingController } from './staking.controller';
import { StakingService } from './staking.service';
import { NftStaking } from '../../../entities/nft-staking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NftStaking])],
  controllers: [StakingController],
  providers: [StakingService],
  exports: [StakingService],
})
export class StakingModule {}
