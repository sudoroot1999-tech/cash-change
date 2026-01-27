import { IsNumber, IsArray, IsBoolean, IsOptional, IsEnum, IsString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdStatus } from '../entities/p2p-ad.entity';

export class UpdateAdDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  marginPercentage?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minLimit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxLimit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  availableAmount?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paymentMethods?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  paymentTimeLimit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  autoReply?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minBuyerRating?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requireVerification?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requireIdVerification?: boolean;

  @ApiProperty({ enum: AdStatus, required: false })
  @IsOptional()
  @IsEnum(AdStatus)
  status?: AdStatus;
}
