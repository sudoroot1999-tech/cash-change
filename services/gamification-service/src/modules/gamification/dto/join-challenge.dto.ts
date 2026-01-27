import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinChallengeDto {
  @ApiProperty({ description: 'Challenge ID to join' })
  @IsUUID()
  challengeId: string;

  @ApiProperty({ description: 'Team ID (for team challenges)', required: false })
  @IsOptional()
  @IsUUID()
  teamId?: string;
}
