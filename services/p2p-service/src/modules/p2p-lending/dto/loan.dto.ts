import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestType } from '../entities/loan-request.entity';

export class CreateLoanOfferDto {
  @ApiProperty({ description: 'Amount willing to lend', example: '1000' })
  @IsString()
  amount: string;

  @ApiProperty({ description: 'Currency/Asset symbol', example: 'USDT' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Minimum interest rate (APR %)', example: 5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  minInterestRate: number;

  @ApiProperty({ description: 'Loan duration in days', example: 30 })
  @IsNumber()
  @Min(1)
  @Max(365)
  durationDays: number;

  @ApiPropertyOptional({ description: 'Minimum borrower credit score', example: 600 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  minCreditScore?: number;

  @ApiPropertyOptional({ description: 'Maximum LTV ratio', example: 75 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(200)
  maxLtvRatio?: number;

  @ApiPropertyOptional({ description: 'Enable auto-matching', default: true })
  @IsOptional()
  @IsBoolean()
  autoMatch?: boolean;
}

export class CreateLoanRequestDto {
  @ApiProperty({ description: 'Amount to borrow', example: '1000' })
  @IsString()
  amount: string;

  @ApiProperty({ description: 'Currency/Asset symbol', example: 'USDT' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Collateral amount', example: '1500' })
  @IsString()
  collateralAmount: string;

  @ApiProperty({ description: 'Collateral asset', example: 'ETH' })
  @IsString()
  collateralAsset: string;

  @ApiProperty({ description: 'Maximum interest rate willing to pay (APR %)', example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  maxInterestRate: number;

  @ApiProperty({ description: 'Loan duration in days', example: 30 })
  @IsNumber()
  @Min(1)
  @Max(365)
  durationDays: number;

  @ApiPropertyOptional({ description: 'Loan purpose', example: 'Trading capital' })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ description: 'Enable auto-matching', default: true })
  @IsOptional()
  @IsBoolean()
  autoMatch?: boolean;
}

export class AcceptLoanMatchDto {
  @ApiProperty({ description: 'Matched request ID' })
  @IsString()
  matchedRequestId: string;

  @ApiProperty({ description: 'Agreed interest rate', example: 7.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  agreedInterestRate: number;

  @ApiPropertyOptional({ description: 'Additional terms' })
  @IsOptional()
  @IsString()
  additionalTerms?: string;
}

export class RepayLoanDto {
  @ApiProperty({ description: 'Loan ID to repay' })
  @IsString()
  loanId: string;

  @ApiProperty({ description: 'Amount to repay', example: '500' })
  @IsString()
  amount: string;

  @ApiPropertyOptional({ description: 'Transaction hash from blockchain' })
  @IsOptional()
  @IsString()
  transactionHash?: string;
}

export class LoanFilterDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Minimum amount' })
  @IsOptional()
  @IsString()
  minAmount?: string;

  @ApiPropertyOptional({ description: 'Maximum amount' })
  @IsOptional()
  @IsString()
  maxAmount?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class MarketplaceFilterDto {
  @ApiProperty({ description: 'Request type', enum: RequestType })
  @IsEnum(RequestType)
  type: RequestType;

  @ApiPropertyOptional({ description: 'Currency filter' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Minimum amount' })
  @IsOptional()
  @IsString()
  minAmount?: string;

  @ApiPropertyOptional({ description: 'Maximum amount' })
  @IsOptional()
  @IsString()
  maxAmount?: string;

  @ApiPropertyOptional({ description: 'Minimum interest rate' })
  @IsOptional()
  @IsNumber()
  minRate?: number;

  @ApiPropertyOptional({ description: 'Maximum interest rate' })
  @IsOptional()
  @IsNumber()
  maxRate?: number;

  @ApiPropertyOptional({ description: 'Duration in days' })
  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
