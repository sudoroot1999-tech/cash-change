import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DisputeReason } from '../entities/p2p-dispute.entity';

export class CreateDisputeDto {
  @ApiProperty({ enum: DisputeReason })
  @IsEnum(DisputeReason)
  reason: DisputeReason;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];
}
