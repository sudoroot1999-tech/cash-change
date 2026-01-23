import { IsInt, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CostBasisMethod } from '../entities/tax-report.entity';

export class GenerateTaxReportDto {
  @ApiProperty({ description: 'Tax year (e.g., 2024)' })
  @IsInt()
  @Min(2010)
  @Max(2100)
  taxYear!: number;

  @ApiPropertyOptional({ description: 'Cost basis calculation method', enum: CostBasisMethod })
  @IsOptional()
  @IsEnum(CostBasisMethod)
  costBasisMethod?: CostBasisMethod;
}

export class ExportTaxReportDto {
  @ApiProperty({ description: 'Export format', enum: ['csv', 'pdf', '8949', 'schedule_d'] })
  @IsEnum(['csv', 'pdf', '8949', 'schedule_d'])
  format!: 'csv' | 'pdf' | '8949' | 'schedule_d';
}

export class TaxReportResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  taxYear!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  costBasisMethod!: CostBasisMethod;

  @ApiProperty()
  totalTransactions!: number;

  @ApiProperty()
  totalGains!: number;

  @ApiProperty()
  totalLosses!: number;

  @ApiProperty()
  netCapitalGain!: number;

  @ApiProperty()
  shortTermGains!: number;

  @ApiProperty()
  longTermGains!: number;

  @ApiProperty()
  totalIncome!: number;

  @ApiPropertyOptional()
  reportUrlCsv?: string;

  @ApiPropertyOptional()
  reportUrlPdf?: string;

  @ApiPropertyOptional()
  form8949Url?: string;

  @ApiPropertyOptional()
  scheduleDUrl?: string;

  @ApiProperty()
  generatedAt?: Date;
}

export class IntegrateTaxSoftwareDto {
  @ApiProperty({ description: 'Tax software provider', enum: ['cointracker', 'koinly'] })
  @IsEnum(['cointracker', 'koinly'])
  provider!: 'cointracker' | 'koinly';

  @ApiProperty({ description: 'Tax year' })
  @IsInt()
  taxYear!: number;
}
