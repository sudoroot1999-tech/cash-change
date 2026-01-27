import { IsOptional, IsEnum, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '../entities/launchpad-project.entity';
import { SaleStatus } from '../entities/sale-round.entity';

export class ProjectQueryDto {
  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  order?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional()
  @IsOptional()
  featured?: boolean;
}

export class SaleRoundQueryDto {
  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: SaleStatus })
  @IsEnum(SaleStatus)
  @IsOptional()
  status?: SaleStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  projectId?: string;
}

export class UserAllocationQueryDto {
  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userId?: string;
}
