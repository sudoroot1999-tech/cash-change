import {
  IsString,
  IsNotEmpty,
  IsEthereumAddress,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ParticipateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  saleRoundId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty()
  @IsEthereumAddress()
  walletAddress!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  referralCode?: string;
}

export class WhitelistApplicationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  saleRoundId!: string;

  @ApiProperty()
  @IsEthereumAddress()
  walletAddress!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  referralCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  applicationAnswers?: Record<string, any>;
}

export class ClaimTokensDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  allocationId!: string;

  @ApiProperty()
  @IsEthereumAddress()
  walletAddress!: string;
}
