import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, IsEnum, IsEthereumAddress } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StakeTokenDto {
  @ApiProperty({ example: '1000.50', description: 'Amount to stake' })
  @IsNotEmpty()
  @IsString()
  amount: string;

  @ApiProperty({ example: 0, description: 'Staking tier ID (0-3)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  tierId: number;

  @ApiProperty({ example: '0x1234...', description: 'Wallet address' })
  @IsNotEmpty()
  @IsEthereumAddress()
  walletAddress: string;
}

export class UnstakeTokenDto {
  @ApiProperty({ example: 'uuid', description: 'Staking position ID' })
  @IsNotEmpty()
  @IsString()
  positionId: string;

  @ApiProperty({ example: '0x1234...', description: 'Wallet address' })
  @IsNotEmpty()
  @IsEthereumAddress()
  walletAddress: string;
}

export class ClaimRewardsDto {
  @ApiProperty({ example: 'uuid', description: 'Staking position ID' })
  @IsNotEmpty()
  @IsString()
  positionId: string;

  @ApiProperty({ example: '0x1234...', description: 'Wallet address' })
  @IsNotEmpty()
  @IsEthereumAddress()
  walletAddress: string;
}

export class ClaimVestingDto {
  @ApiProperty({ example: 'uuid', description: 'Vesting schedule ID' })
  @IsNotEmpty()
  @IsString()
  scheduleId: string;

  @ApiProperty({ example: '0x1234...', description: 'Wallet address' })
  @IsNotEmpty()
  @IsEthereumAddress()
  walletAddress: string;
}

export class TransferTokenDto {
  @ApiProperty({ example: '0xabcd...', description: 'Recipient address' })
  @IsNotEmpty()
  @IsEthereumAddress()
  toAddress: string;

  @ApiProperty({ example: '100.50', description: 'Amount to transfer' })
  @IsNotEmpty()
  @IsString()
  amount: string;

  @ApiProperty({ example: '0x1234...', description: 'Sender wallet address' })
  @IsNotEmpty()
  @IsEthereumAddress()
  fromAddress: string;
}

export class TokenBalanceResponse {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  balance: string;

  @ApiProperty()
  lockedBalance: string;

  @ApiProperty()
  stakedBalance: string;

  @ApiProperty()
  availableBalance: string;

  @ApiProperty()
  totalEarned: string;

  @ApiProperty()
  feeDiscountTier: number;

  @ApiProperty()
  feeDiscountPercentage: number;
}

export class TokenPriceResponse {
  @ApiProperty()
  price: string;

  @ApiProperty()
  priceEth: string;

  @ApiProperty()
  priceBnb: string;

  @ApiProperty()
  volume24h: string;

  @ApiProperty()
  marketCap: string;

  @ApiProperty()
  circulatingSupply: string;

  @ApiProperty()
  change24h: number;

  @ApiProperty()
  timestamp: Date;
}

export class TokenSupplyResponse {
  @ApiProperty()
  totalSupply: string;

  @ApiProperty()
  circulatingSupply: string;

  @ApiProperty()
  totalBurned: string;

  @ApiProperty()
  totalStaked: string;

  @ApiProperty()
  totalLocked: string;
}

export class StakingRewardsResponse {
  @ApiProperty()
  positionId: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  tierId: number;

  @ApiProperty()
  apy: number;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  pendingRewards: string;

  @ApiProperty()
  claimedRewards: string;

  @ApiProperty()
  status: string;
}

export class VestingInfoResponse {
  @ApiProperty()
  scheduleId: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  totalAmount: string;

  @ApiProperty()
  releasedAmount: string;

  @ApiProperty()
  vestedAmount: string;

  @ApiProperty()
  claimableAmount: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  status: string;
}

export class FeeDiscountResponse {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  tokenBalance: string;

  @ApiProperty()
  discountTier: number;

  @ApiProperty()
  discountPercentage: number;

  @ApiProperty()
  requiredForNextTier: string;
}
