import { ApiProperty } from '@nestjs/swagger';
import { RewardType } from '../entities/reward-history.entity';

export class RewardHistoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  rewardType: RewardType;

  @ApiProperty()
  rewardAsset: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  valueUsd: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  transactionHash: string;

  @ApiProperty()
  claimedAt: Date;

  @ApiProperty()
  createdAt: Date;
}

export class TotalRewardsResponseDto {
  @ApiProperty()
  totalStakingRewards: string;

  @ApiProperty()
  totalFarmingRewards: string;

  @ApiProperty()
  totalLendingRewards: string;

  @ApiProperty()
  totalRewards: string;

  @ApiProperty()
  totalValueUsd: string;
}
