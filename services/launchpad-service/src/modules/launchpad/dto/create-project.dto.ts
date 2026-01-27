import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsEthereumAddress,
  IsNumber,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TeamMemberDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  role!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bio!: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  linkedin?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  twitter?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  photo?: string;
}

class TokenomicsDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  publicSale!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  privateSale!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  team!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  advisors!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  liquidity!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  ecosystem!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  marketing!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  reserve!: number;
}

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  longDescription?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  whitepaper?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  twitter?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  telegram?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  discord?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  medium?: string;

  @ApiProperty()
  @IsEthereumAddress()
  tokenAddress!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(18)
  tokenDecimals!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  totalSupply!: string;

  @ApiProperty({ type: TokenomicsDto })
  @ValidateNested()
  @Type(() => TokenomicsDto)
  tokenomics!: TokenomicsDto;

  @ApiProperty({ type: [TeamMemberDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  teamMembers!: TeamMemberDto[];
}
