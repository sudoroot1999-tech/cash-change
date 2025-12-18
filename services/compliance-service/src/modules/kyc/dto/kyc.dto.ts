import { IsString, IsEnum, IsOptional, IsDateString, IsISO31661Alpha2 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { KycLevel } from '../entities/kyc-request.entity';

export class SubmitKycDto {
  @ApiProperty({ enum: KycLevel })
  @IsEnum(KycLevel)
  level: KycLevel;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString()
  dob: string;

  @ApiProperty({ example: 'US', description: 'ISO 3166-1 alpha-2 country code' })
  @IsISO31661Alpha2()
  country: string;
}

export class ReviewKycDto {
  @ApiProperty({ enum: ['approved', 'rejected', 'more_info_required'] })
  @IsString()
  decision: 'approved' | 'rejected' | 'more_info_required';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
