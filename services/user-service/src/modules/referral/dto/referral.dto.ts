import { IsString, IsOptional, IsNumber, IsEnum, IsUUID, Min, Max, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReferralCodeDto {
  @ApiPropertyOptional({ description: 'Custom referral code (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ enum: ['standard', 'affiliate', 'vip'], default: 'standard' })
  @IsOptional()
  @IsEnum(['standard', 'affiliate', 'vip'])
  type?: 'standard' | 'affiliate' | 'vip';

  @ApiPropertyOptional({ description: 'Custom commission rate (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Maximum usage limit' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsageLimit?: number;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UseReferralCodeDto {
  @ApiProperty({ description: 'Referral code to use' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'IP address of the referee' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Device fingerprint' })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @ApiPropertyOptional({ description: 'UTM source' })
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiPropertyOptional({ description: 'UTM medium' })
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiPropertyOptional({ description: 'UTM campaign' })
  @IsOptional()
  @IsString()
  utmCampaign?: string;
}

export class ReferralStatsQueryDto {
  @ApiPropertyOptional({ description: 'Start date for stats' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for stats' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Group by period', enum: ['day', 'week', 'month'] })
  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month';
}

export class ClaimCommissionDto {
  @ApiProperty({ description: 'Commission IDs to claim' })
  @IsUUID('4', { each: true })
  commissionIds: string[];
}

export class LeaderboardQueryDto {
  @ApiPropertyOptional({ description: 'Time period', enum: ['daily', 'weekly', 'monthly', 'all_time'], default: 'monthly' })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'all_time'])
  period?: 'daily' | 'weekly' | 'monthly' | 'all_time';

  @ApiPropertyOptional({ description: 'Limit results', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({ description: 'Metric to rank by', enum: ['referrals', 'earnings', 'volume'], default: 'earnings' })
  @IsOptional()
  @IsEnum(['referrals', 'earnings', 'volume'])
  metric?: 'referrals' | 'earnings' | 'volume';
}

export class TradeCommissionDto {
  @ApiProperty({ description: 'User ID who executed the trade' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Trade ID' })
  @IsUUID()
  tradeId: string;

  @ApiProperty({ description: 'Trading fee amount' })
  @IsNumber()
  @Min(0)
  tradingFee: number;

  @ApiProperty({ description: 'Trading pair' })
  @IsString()
  tradingPair: string;

  @ApiProperty({ description: 'Order type' })
  @IsString()
  orderType: string;

  @ApiPropertyOptional({ description: 'Trade volume' })
  @IsOptional()
  @IsNumber()
  volume?: number;
}
