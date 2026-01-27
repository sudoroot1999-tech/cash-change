import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RatingType } from '../entities/user-rating.entity';

export class CreateRatingDto {
  @ApiProperty({ enum: RatingType })
  @IsEnum(RatingType)
  type: RatingType;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;
}
