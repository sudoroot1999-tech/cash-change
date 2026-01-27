import { IsString, IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdType } from '../entities/p2p-ad.entity';
import { Type } from 'class-transformer';

export class SearchAdsDto {
  @ApiProperty({ enum: AdType, required: false })
  @IsOptional()
  @IsEnum(AdType)
  type?: AdType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cryptoAsset?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fiatCurrency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sortBy?: string = 'price';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
