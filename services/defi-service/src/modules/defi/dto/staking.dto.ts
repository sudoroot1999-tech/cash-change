import { IsString, IsNumber, IsEnum, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StakingType } from '../entities/staking-position.entity';

export class StakeDto {
  @ApiProperty({ example: 'BTC' })
  @IsString()
  coin: string;

  @ApiProperty({ example: '1.5' })
  @IsString()
  amount: string;

  @ApiProperty({ enum: StakingType, example: StakingType.FLEXIBLE })
  @IsEnum(StakingType)
  stakingType: StakingType;

  @ApiProperty({ example: 30, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lockDays?: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  autoCompound: boolean;
}

export class UnstakeDto {
  @ApiProperty({ example: 'uuid-123' })
  @IsString()
  positionId: string;
}

export class ClaimRewardsDto {
  @ApiProperty({ example: 'uuid-123' })
  @IsString()
  positionId: string;
}

export class StakingPositionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  coin: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  rewardsEarned: string;

  @ApiProperty()
  apr: string;

  @ApiProperty()
  stakingType: StakingType;

  @ApiProperty()
  lockDays: number;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  autoCompound: boolean;
}
