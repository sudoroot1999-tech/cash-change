import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClaimMissionDto {
  @ApiProperty({ description: 'Mission ID to claim' })
  @IsUUID()
  missionId: string;
}
