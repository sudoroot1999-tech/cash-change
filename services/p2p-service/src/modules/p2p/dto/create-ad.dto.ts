import { IsString, IsEnum, IsNumber, IsArray, IsBoolean, IsOptional, Min, Max, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdType } from '../entities/p2p-ad.entity';

export class CreateAdDto {
  @ApiProperty({ enum: AdType, example: AdType.SELL })
  @IsEnum(AdType)
  type: AdType;

  @ApiProperty({ example: 'USDT' })
  @IsString()
  cryptoAsset: string;

  @ApiProperty({ example: 'IRR' })
  @IsString()
  fiatCurrency: string;

  @ApiProperty({ example: 65000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'fixed', required: false })
  @IsOptional()
  @IsString()
  priceType?: string;

  @ApiProperty({ example: 1.5, required: false })
  @IsOptional()
  @IsNumber()
  marginPercentage?: number;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0)
  minLimit: number;

  @ApiProperty({ example: 10000000 })
  @IsNumber()
  @Min(0)
  maxLimit: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  availableAmount: number;

  @ApiProperty({ example: ['bank_transfer', 'cash'], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  paymentMethods: string[];

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(5)
  @Max(1440)
  paymentTimeLimit: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  autoReply?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minBuyerRating?: number;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  requireVerification?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  requireIdVerification?: boolean;
}
