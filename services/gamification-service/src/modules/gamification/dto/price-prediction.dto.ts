import { IsString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PredictionDirection {
  UP = 'up',
  DOWN = 'down',
}

export class PricePredictionDto {
  @ApiProperty({ description: 'Symbol to predict' })
  @IsString()
  symbol: string;

  @ApiProperty({ description: 'Prediction direction', enum: PredictionDirection })
  @IsEnum(PredictionDirection)
  direction: PredictionDirection;

  @ApiProperty({ description: 'Time window in minutes', minimum: 1 })
  @IsInt()
  @Min(1)
  timeWindowMinutes: number;
}
