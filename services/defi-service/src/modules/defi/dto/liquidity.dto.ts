import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddLiquidityDto {
  @ApiProperty({ example: 'BTC' })
  @IsString()
  token0: string;

  @ApiProperty({ example: 'ETH' })
  @IsString()
  token1: string;

  @ApiProperty({ example: '1.0' })
  @IsString()
  amount0: string;

  @ApiProperty({ example: '15.0' })
  @IsString()
  amount1: string;

  @ApiProperty({ example: '0.95' })
  @IsString()
  minLiquidity: string;
}

export class RemoveLiquidityDto {
  @ApiProperty({ example: 'pool-id-123' })
  @IsString()
  poolId: string;

  @ApiProperty({ example: '10.5' })
  @IsString()
  liquidity: string;

  @ApiProperty({ example: '0.9' })
  @IsString()
  minAmount0: string;

  @ApiProperty({ example: '14.0' })
  @IsString()
  minAmount1: string;
}

export class HarvestRewardsDto {
  @ApiProperty({ example: 'pool-id-123' })
  @IsString()
  poolId: string;
}

export class LiquidityPoolResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  token0: string;

  @ApiProperty()
  token1: string;

  @ApiProperty()
  pairSymbol: string;

  @ApiProperty()
  reserve0: string;

  @ApiProperty()
  reserve1: string;

  @ApiProperty()
  tvl: string;

  @ApiProperty()
  apr: string;

  @ApiProperty()
  totalLpTokens: string;

  @ApiProperty()
  lpTokenAddress: string;

  @ApiProperty()
  status: string;
}

export class LiquidityPositionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  poolId: string;

  @ApiProperty()
  lpTokenAmount: string;

  @ApiProperty()
  token0Amount: string;

  @ApiProperty()
  token1Amount: string;

  @ApiProperty()
  farmingRewards: string;

  @ApiProperty()
  impermanentLoss: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  autoHarvest: boolean;

  @ApiProperty()
  autoRestake: boolean;
}
