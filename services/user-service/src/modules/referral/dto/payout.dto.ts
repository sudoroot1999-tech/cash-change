import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestPayoutDto {
  @ApiProperty({ description: 'Payout amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Payment method', enum: ['bank_transfer', 'crypto', 'paypal', 'internal_wallet'] })
  @IsEnum(['bank_transfer', 'crypto', 'paypal', 'internal_wallet'])
  paymentMethod: 'bank_transfer' | 'crypto' | 'paypal' | 'internal_wallet';

  @ApiProperty({ description: 'Payment details' })
  @IsObject()
  paymentDetails: {
    bankAccount?: string;
    walletAddress?: string;
    cryptoCurrency?: string;
    paypalEmail?: string;
  };

  @ApiPropertyOptional({ description: 'Tax information' })
  @IsOptional()
  @IsObject()
  taxInformation?: {
    taxId?: string;
    taxRate?: number;
  };
}

export class PayoutQueryDto {
  @ApiPropertyOptional({ description: 'Status filter', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] })
  @IsOptional()
  @IsEnum(['pending', 'processing', 'completed', 'failed', 'cancelled'])
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class ProcessPayoutDto {
  @ApiProperty({ description: 'Payout ID' })
  @IsString()
  payoutId: string;

  @ApiProperty({ description: 'New status', enum: ['processing', 'completed', 'failed', 'cancelled'] })
  @IsEnum(['processing', 'completed', 'failed', 'cancelled'])
  status: 'processing' | 'completed' | 'failed' | 'cancelled';

  @ApiPropertyOptional({ description: 'Transaction ID' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Failure reason' })
  @IsOptional()
  @IsString()
  failureReason?: string;

  @ApiPropertyOptional({ description: 'Processing notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
