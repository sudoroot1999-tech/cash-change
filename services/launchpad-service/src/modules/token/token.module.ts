import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { TokenHolding } from './entities/token-holding.entity';
import { TokenTransaction } from './entities/token-transaction.entity';
import { VestingSchedule } from './entities/vesting-schedule.entity';
import { StakingPosition } from './entities/staking-position.entity';
import { BurnHistory } from './entities/burn-history.entity';
import { TokenPrice } from './entities/token-price.entity';

// Services
import { TokenService } from './token.service';
import { StakingService } from './services/staking.service';
import { VestingService } from './services/vesting.service';
import { BlockchainService } from './services/blockchain.service';
import { PriceOracleService } from './services/price-oracle.service';

// Controllers
import { TokenController } from './token.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TokenHolding,
      TokenTransaction,
      VestingSchedule,
      StakingPosition,
      BurnHistory,
      TokenPrice,
    ]),
  ],
  controllers: [TokenController],
  providers: [
    TokenService,
    StakingService,
    VestingService,
    BlockchainService,
    PriceOracleService,
  ],
  exports: [TokenService, StakingService, VestingService],
})
export class TokenModule {}
