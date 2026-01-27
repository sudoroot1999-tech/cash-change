import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, VettingStatus } from '../entities/launchpad-project.entity';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class UpdateProjectStatusDto {
  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: VettingStatus })
  @IsEnum(VettingStatus)
  @IsOptional()
  vettingStatus?: VettingStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
