import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { LaunchpadProject } from './entities/launchpad-project.entity';
import { SaleRound } from './entities/sale-round.entity';
import { UserAllocation } from './entities/user-allocation.entity';
import { TokenClaim } from './entities/token-claim.entity';
import { VestingSchedule } from './entities/vesting-schedule.entity';
import { Whitelist } from './entities/whitelist.entity';
import { PlatformStaking } from './entities/staking.entity';

// Services
import { ProjectService } from './services/project.service';
import { SaleRoundService } from './services/sale-round.service';
import { AllocationService } from './services/allocation.service';
import { VestingService } from './services/vesting.service';
import { WhitelistService } from './services/whitelist.service';
import { StakingService } from './services/staking.service';
import { BlockchainService } from './services/blockchain.service';

// Controllers
import { LaunchpadController } from './controllers/launchpad.controller';
import { AdminController } from './controllers/admin.controller';
import { StakingController } from './controllers/staking.controller';

// Tasks
import { SaleStatusTask } from './tasks/sale-status.task';
import { VestingProcessorTask } from './tasks/vesting-processor.task';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LaunchpadProject,
      SaleRound,
      UserAllocation,
      TokenClaim,
      VestingSchedule,
      Whitelist,
      PlatformStaking,
    ])
  ],
  controllers: [LaunchpadController, AdminController, StakingController],
  providers: [
    ProjectService,
    SaleRoundService,
    AllocationService,
    VestingService,
    WhitelistService,
    StakingService,
    BlockchainService,
    SaleStatusTask,
    VestingProcessorTask,
  ],
})
export class LaunchpadModule {}
