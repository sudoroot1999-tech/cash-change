import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GDPRRequestType } from '../entities/gdpr-request.entity';

export class CreateGDPRRequestDto {
  @ApiProperty({ description: 'GDPR request type', enum: GDPRRequestType })
  @IsEnum(GDPRRequestType)
  type!: GDPRRequestType;

  @ApiPropertyOptional({ description: 'Reason for the request' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional details' })
  @IsOptional()
  details?: Record<string, any>;
}

export class ProcessGDPRRequestDto {
  @ApiProperty({ description: 'Processing status', enum: ['completed', 'rejected'] })
  @IsEnum(['completed', 'rejected'])
  status!: 'completed' | 'rejected';

  @ApiPropertyOptional({ description: 'Processing notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DataExportResponseDto {
  @ApiProperty()
  requestId!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ description: 'URL to download the exported data' })
  exportUrl?: string;

  @ApiPropertyOptional({ description: 'Export expiration date' })
  exportExpiresAt?: Date;

  @ApiProperty()
  createdAt!: Date;
}

export class ConsentDto {
  @ApiProperty({ description: 'Policy type', enum: ['cookies', 'marketing', 'analytics'] })
  @IsEnum(['cookies', 'marketing', 'analytics'])
  type!: string;

  @ApiProperty({ description: 'Consent granted' })
  consent!: boolean;
}
