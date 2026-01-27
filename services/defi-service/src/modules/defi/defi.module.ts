import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { StakingPosition } from './entities/staking-position.entity';
import { LiquidityPool } from './entities/liquidity-pool.entity';
import { LiquidityPosition } from './entities/liquidity-position.entity';
import { Loan } from './entities/loan.entity';
import { RewardHistory } from './entities/reward-history.entity';

// Services
import { BlockchainService } from './services/blockchain.service';
import { StakingService } from './services/staking.service';
import { LendingService } from './services/lending.service';
import { LiquidityService } from './services/liquidity.service';
import { RewardsService } from './services/rewards.service';
import { ExternalDeFiService } from './services/external-defi.service';

// Controllers
import { StakingController } from './controllers/staking.controller';
import { LendingController } from './controllers/lending.controller';
import { LiquidityController } from './controllers/liquidity.controller';
import { RewardsController } from './controllers/rewards.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StakingPosition,
      LiquidityPool,
      LiquidityPosition,
      Loan,
      RewardHistory,
    ]),
  ],
  controllers: [
    StakingController,
    LendingController,
    LiquidityController,
    RewardsController,
  ],
  providers: [
    BlockchainService,
    StakingService,
    LendingService,
    LiquidityService,
    RewardsService,
    ExternalDeFiService,
  ],
})
export class DefiModule {}
