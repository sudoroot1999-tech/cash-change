import { IsUUID, IsEnum, IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MonitoringStatus } from '../entities/transaction-monitoring.entity';

export class ScreenTransactionDto {
  @ApiProperty({ description: 'Transaction ID' })
  @IsUUID()
  transactionId!: string;

  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Transaction type' })
  @IsString()
  transactionType!: string;

  @ApiProperty({ description: 'Transaction amount' })
  @IsNumber()
  amount!: number;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  currency!: string;

  @ApiPropertyOptional({ description: 'From address/wallet' })
  @IsOptional()
  @IsString()
  fromAddress?: string;

  @ApiPropertyOptional({ description: 'To address/wallet' })
  @IsOptional()
  @IsString()
  toAddress?: string;

  @ApiPropertyOptional({ description: 'Blockchain transaction hash' })
  @IsOptional()
  @IsString()
  blockchainHash?: string;
}

export class ReviewTransactionDto {
  @ApiProperty({ description: 'Monitoring status', enum: MonitoringStatus })
  @IsEnum(MonitoringStatus)
  status!: MonitoringStatus;

  @ApiPropertyOptional({ description: 'Review notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReportSuspiciousActivityDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ description: 'Transaction ID if applicable' })
  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @ApiProperty({ description: 'Type of suspicious activity' })
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Reason for reporting' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ description: 'Additional details' })
  @IsOptional()
  details?: Record<string, any>;
}

export class TransactionRiskResponseDto {
  @ApiProperty()
  transactionId!: string;

  @ApiProperty({ enum: MonitoringStatus })
  status!: MonitoringStatus;

  @ApiProperty()
  riskScore!: number;

  @ApiProperty()
  flags!: string[];

  @ApiProperty()
  isHighValue!: boolean;

  @ApiProperty()
  isCtrReportable!: boolean;

  @ApiPropertyOptional()
  chainalysisResult?: Record<string, any>;
}
