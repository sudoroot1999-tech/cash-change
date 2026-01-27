import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsDate,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsArray,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleType, RoundType } from '../entities/sale-round.entity';

class VestingPhaseDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  percentage!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unlockTime!: number;

  @ApiProperty()
  @IsString()
  description!: string;
}

class TierMultipliersDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  tier1!: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  tier2!: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  tier3!: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  tier4!: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  tier5!: number;
}

class DutchAuctionConfigDto {
  @ApiProperty()
  @IsString()
  startPrice!: string;

  @ApiProperty()
  @IsString()
  endPrice!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  priceDecreaseInterval!: number;

  @ApiProperty()
  @IsString()
  priceDecreaseAmount!: string;
}

export class CreateSaleRoundDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: RoundType })
  @IsEnum(RoundType)
  roundType!: RoundType;

  @ApiProperty({ enum: SaleType })
  @IsEnum(SaleType)
  saleType!: SaleType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tokenPrice!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tokenAllocation!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentCurrency!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hardCap!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  softCap!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  minAllocation!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  maxAllocation!: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  whitelistStartTime!: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  whitelistEndTime!: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  saleStartTime!: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  saleEndTime!: Date;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  claimStartTime?: Date;

  @ApiProperty()
  @IsBoolean()
  kycRequired!: boolean;

  @ApiProperty()
  @IsBoolean()
  stakingRequired!: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  minStakingAmount?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  minStakingDays?: number;

  @ApiPropertyOptional({ type: TierMultipliersDto })
  @ValidateNested()
  @Type(() => TierMultipliersDto)
  @IsOptional()
  tierMultipliers?: TierMultipliersDto;

  @ApiPropertyOptional({ type: [VestingPhaseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VestingPhaseDto)
  @IsOptional()
  vestingSchedule?: VestingPhaseDto[];

  @ApiProperty()
  @IsBoolean()
  isVestingEnabled!: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  tgePercentage?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  vestingDuration?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  vestingCliff?: number;

  @ApiPropertyOptional({ type: DutchAuctionConfigDto })
  @ValidateNested()
  @Type(() => DutchAuctionConfigDto)
  @IsOptional()
  dutchAuctionConfig?: DutchAuctionConfigDto;
}
