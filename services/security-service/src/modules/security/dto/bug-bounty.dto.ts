import { IsString, IsEmail, IsOptional, IsEnum, IsArray } from 'class-validator';
import { BugSeverity } from '../entities/bug-bounty.entity';

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

  @IsEnum(BugSeverity)
  severity: BugSeverity;

  @IsOptional()
  @IsString()
  pocUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
