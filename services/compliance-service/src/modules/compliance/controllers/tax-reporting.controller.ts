import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TaxReportingService } from '../services/tax-reporting.service';
import {
  GenerateTaxReportDto,
  ExportTaxReportDto,
  TaxReportResponseDto,
  IntegrateTaxSoftwareDto,
} from '../dto/tax-report.dto';
import { RequireAuth } from '@exchange/common';

@ApiTags('Tax Reporting')
@RequireAuth()
@Controller('compliance/tax')
export class TaxReportingController {
  constructor(private readonly taxReportingService: TaxReportingService) { }

  @Post('report/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate tax report for a year' })
  @ApiResponse({ status: 200, type: TaxReportResponseDto })
  async generateReport(@Body() dto: GenerateTaxReportDto, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id';

    const report = await this.taxReportingService.generateTaxReport(
      userId,
      dto.taxYear,
      dto.costBasisMethod,
    );

    return {
      success: true,
      data: {
        id: report.id,
        taxYear: report.taxYear,
        status: report.status,
        costBasisMethod: report.costBasisMethod,
        totalTransactions: report.totalTransactions,
        totalGains: Number(report.totalGains),
        totalLosses: Number(report.totalLosses),
        netCapitalGain: Number(report.netCapitalGain),
        shortTermGains: Number(report.shortTermGains),
        longTermGains: Number(report.longTermGains),
        totalIncome: Number(report.totalIncome),
        reportUrlCsv: report.reportUrlCsv,
        reportUrlPdf: report.reportUrlPdf,
        form8949Url: report.form8949Url,
        scheduleDUrl: report.scheduleDUrl,
        generatedAt: report.generatedAt,
      },
    };
  }

  @Get('report/:year')
  @ApiOperation({ summary: 'Get tax report for a specific year' })
  @ApiResponse({ status: 200, type: TaxReportResponseDto })
  async getReport(@Param('year') year: string, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    const taxYear = parseInt(year, 10);

    const report = await this.taxReportingService.getTaxReport(userId, taxYear);

    return {
      success: true,
      data: {
        id: report.id,
        taxYear: report.taxYear,
        status: report.status,
        costBasisMethod: report.costBasisMethod,
        totalTransactions: report.totalTransactions,
        totalGains: Number(report.totalGains),
        totalLosses: Number(report.totalLosses),
        netCapitalGain: Number(report.netCapitalGain),
        shortTermGains: Number(report.shortTermGains),
        longTermGains: Number(report.longTermGains),
        totalIncome: Number(report.totalIncome),
        reportUrlCsv: report.reportUrlCsv,
        reportUrlPdf: report.reportUrlPdf,
        form8949Url: report.form8949Url,
        scheduleDUrl: report.scheduleDUrl,
        generatedAt: report.generatedAt,
      },
    };
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get all tax reports for user' })
  async getUserReports(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    const reports = await this.taxReportingService.getUserTaxReports(userId);

    return {
      success: true,
      data: reports,
    };
  }

  @Post('integrate/cointracker')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export to CoinTracker' })
  async exportToCoinTracker(@Body() dto: IntegrateTaxSoftwareDto, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id';

    await this.taxReportingService.exportToCoinTracker(userId, dto.taxYear);

    return {
      success: true,
      message: 'Exported to CoinTracker successfully',
    };
  }

  @Post('integrate/koinly')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export to Koinly' })
  async exportToKoinly(@Body() dto: IntegrateTaxSoftwareDto, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id';

    await this.taxReportingService.exportToKoinly(userId, dto.taxYear);

    return {
      success: true,
      message: 'Exported to Koinly successfully',
    };
  }
}
