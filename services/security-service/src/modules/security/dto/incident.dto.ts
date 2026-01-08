import { IsString, IsEnum, IsOptional, IsArray, IsObject } from 'class-validator';
import { INCIDENT_SEVERITY, INCIDENT_TYPES, IncidentSeverity, IncidentType } from '@exchange/common';

export class CreateIncidentDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(INCIDENT_TYPES)
  type: IncidentType;

  @IsEnum(INCIDENT_SEVERITY)
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
