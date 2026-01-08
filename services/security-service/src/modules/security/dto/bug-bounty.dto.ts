import { IsString, IsEmail, IsOptional, IsEnum, IsArray } from 'class-validator';
import { BUG_SEVERITY, BugSeverity } from '@exchange/common';


export class SubmitBugBountyDto {
  @IsEmail()
  reporterEmail: string;

  @IsOptional()
  @IsString()
  reporterName?: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(BUG_SEVERITY)
  severity: BugSeverity;

  @IsOptional()
  @IsString()
  pocUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
