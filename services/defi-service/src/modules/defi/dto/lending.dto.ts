import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CollateralType } from '../entities/loan.entity';

export class BorrowDto {
  @ApiProperty({ example: 'BTC' })
  @IsString()
  collateralAsset: string;

  @ApiProperty({ example: '2.0' })
  @IsString()
  collateralAmount: string;

  @ApiProperty({ example: 'USDT' })
  @IsString()
  borrowedAsset: string;

  @ApiProperty({ example: '50000' })
  @IsString()
  borrowedAmount: string;

  @ApiProperty({ enum: CollateralType, example: CollateralType.CRYPTO, required: false })
  @IsOptional()
  @IsEnum(CollateralType)
  collateralType?: CollateralType;

  @ApiProperty({ example: '123', required: false })
  @IsOptional()
  @IsString()
  nftTokenId?: string;

  @ApiProperty({ example: '0x...', required: false })
  @IsOptional()
  @IsString()
  nftContractAddress?: string;
}

export class RepayDto {
  @ApiProperty({ example: 'loan-id-123' })
  @IsString()
  loanId: string;

  @ApiProperty({ example: '10000' })
  @IsString()
  amount: string;
}

export class LoanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  collateralAsset: string;

  @ApiProperty()
  collateralAmount: string;

  @ApiProperty()
  collateralValueUsd: string;

  @ApiProperty()
  collateralType: CollateralType;

  @ApiProperty()
  borrowedAsset: string;

  @ApiProperty()
  borrowedAmount: string;

  @ApiProperty()
  accruedInterest: string;

  @ApiProperty()
  interestRate: string;

  @ApiProperty()
  healthFactor: string;

  @ApiProperty()
  ltvRatio: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  loanStartDate: Date;
}

export class HealthFactorResponseDto {
  @ApiProperty()
  loanId: string;

  @ApiProperty()
  healthFactor: string;

  @ApiProperty()
  isHealthy: boolean;

  @ApiProperty()
  liquidationThreshold: string;

  @ApiProperty()
  collateralValueUsd: string;

  @ApiProperty()
  borrowedValueUsd: string;
}
