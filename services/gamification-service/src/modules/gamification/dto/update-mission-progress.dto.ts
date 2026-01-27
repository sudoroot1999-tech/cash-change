import { IsUUID, IsInt, Min, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMissionProgressDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Mission code' })
  @IsString()
  missionCode: string;

  @ApiProperty({ description: 'Progress amount to add', minimum: 1 })
  @IsInt()
  @Min(1)
  progressAmount: number;
}
