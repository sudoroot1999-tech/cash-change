import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SpinType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export class PlaySpinWheelDto {
  @ApiProperty({ description: 'Spin type', enum: SpinType })
  @IsEnum(SpinType)
  spinType: SpinType;
}
