import { IsUUID, IsInt, IsEnum, IsString, IsOptional, IsObject, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { XpSource } from '../entities/xp-transaction.entity';

export class AddXpDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Amount of XP to add', minimum: 1 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Source of XP', enum: XpSource })
  @IsEnum(XpSource)
  source: XpSource;

  @ApiProperty({ description: 'Source identifier', required: false })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
