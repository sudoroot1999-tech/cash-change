import { IsString, IsEnum, IsOptional, IsArray, IsObject } from 'class-validator';
import { IncidentType, IncidentSeverity } from '../entities/incident.entity';

export class CreateIncidentDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(IncidentType)
  type: IncidentType;

  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affectedUsers?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affectedSystems?: string[];

  @IsOptional()
  @IsString()
  detectedBy?: string;

  @IsOptional()
  @IsObject()
  evidence?: Record<string, any>;
}
