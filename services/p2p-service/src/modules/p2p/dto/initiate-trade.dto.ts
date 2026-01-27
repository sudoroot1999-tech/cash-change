import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateTradeDto {
  @ApiProperty({ example: 'ad-uuid-here' })
  @IsString()
  adId: string;

  @ApiProperty({ example: 1000000, description: 'Fiat amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'bank_transfer' })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
