import { IsString, IsOptional, IsNumber, IsEnum, IsObject, IsDateString, Min, Max, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAffiliateCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Commission rate (%)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate: number;

  @ApiPropertyOptional({ description: 'Custom tier 1 commission rate (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tier1Rate?: number;

  @ApiPropertyOptional({ description: 'Custom tier 2 commission rate (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tier2Rate?: number;

  @ApiPropertyOptional({ description: 'Custom landing page URL' })
  @IsOptional()
  @IsUrl()
  landingPageUrl?: string;

  @ApiPropertyOptional({ description: 'Tracking pixel code' })
  @IsOptional()
  @IsString()
  trackingPixel?: string;

  @ApiProperty({ description: 'Campaign start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Campaign end date' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Target audience' })
  @IsOptional()
  @IsObject()
  targetAudience?: {
    regions?: string[];
    demographics?: string;
    interests?: string[];
  };
}

export class UpdateAffiliateCampaignDto {
  @ApiPropertyOptional({ description: 'Campaign name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'paused', 'completed', 'rejected'] })
  @IsOptional()
  @IsEnum(['draft', 'active', 'paused', 'completed', 'rejected'])
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'rejected';

  @ApiPropertyOptional({ description: 'Custom landing page URL' })
  @IsOptional()
  @IsUrl()
  landingPageUrl?: string;

  @ApiPropertyOptional({ description: 'Tracking pixel code' })
  @IsOptional()
  @IsString()
  trackingPixel?: string;
}

export class AffiliateApplicationDto {
  @ApiProperty({ description: 'Full name' })
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Email address' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Website or social media URL' })
  @IsUrl()
  websiteUrl: string;

  @ApiProperty({ description: 'Platform type', enum: ['website', 'youtube', 'instagram', 'twitter', 'tiktok', 'other'] })
  @IsEnum(['website', 'youtube', 'instagram', 'twitter', 'tiktok', 'other'])
  platform: string;

  @ApiProperty({ description: 'Follower/subscriber count' })
  @IsNumber()
  @Min(0)
  followerCount: number;

  @ApiProperty({ description: 'How will you promote our platform?' })
  @IsString()
  promotionStrategy: string;

  @ApiPropertyOptional({ description: 'Additional information' })
  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @ApiPropertyOptional({ description: 'Requested commission rate (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  requestedCommissionRate?: number;
}

export class AffiliateStatsQueryDto {
  @ApiPropertyOptional({ description: 'Campaign ID' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class TrackClickDto {
  @ApiProperty({ description: 'Campaign ID or referral code' })
  @IsString()
  trackingId: string;

  @ApiPropertyOptional({ description: 'Source of click' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Medium' })
  @IsOptional()
  @IsString()
  medium?: string;

  @ApiPropertyOptional({ description: 'IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
