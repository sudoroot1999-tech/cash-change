import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TransactionMonitoringService } from '../services/transaction-monitoring.service';
import {
  ScreenTransactionDto,
  ReviewTransactionDto,
  ReportSuspiciousActivityDto,
  TransactionRiskResponseDto,
} from '../dto/transaction-monitoring.dto';
import { SARStatus } from '../entities/suspicious-activity.entity';
import { RequireAuth } from '@exchange/common';

@ApiTags('Transaction Monitoring')
@RequireAuth()
@Controller('compliance/transaction-monitoring')
export class TransactionMonitoringController {
  constructor(private readonly transactionMonitoringService: TransactionMonitoringService) { }

  @Post('screen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Screen a transaction in real-time' })
  @ApiResponse({ status: 200, type: TransactionRiskResponseDto })
  async screenTransaction(@Body() dto: ScreenTransactionDto) {
    const monitoring = await this.transactionMonitoringService.screenTransaction(dto);

    return {
      success: true,
      data: {
        transactionId: monitoring.transactionId,
        status: monitoring.status,
        riskScore: monitoring.riskScore,
        flags: monitoring.flags,
        isHighValue: monitoring.isHighValue,
        isCtrReportable: monitoring.isCtrReportable,
        chainalysisResult: monitoring.chainalysisResult,
      },
    };
  }

  @Patch('review/:transactionId')
  @ApiOperation({ summary: 'Review flagged transaction (Admin only)' })
  async reviewTransaction(
    @Param('transactionId') transactionId: string,
    @Body() dto: ReviewTransactionDto,
    @Request() req: any,
  ) {
    const reviewedBy = req.user?.id || 'admin-id';

    const monitoring = await this.transactionMonitoringService.reviewTransaction(
      transactionId,
      dto.status,
      reviewedBy,
      dto.notes,
    );

    return {
      success: true,
      data: monitoring,
    };
  }

  @Post('report-suspicious')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report suspicious activity' })
  async reportSuspicious(@Body() dto: ReportSuspiciousActivityDto) {
    const sar = await this.transactionMonitoringService.createSuspiciousActivity(
      dto.userId,
      dto.transactionId || '',
      dto.type as any,
      dto.reason,
      70, // Default risk score
      dto.details,
    );

    return {
      success: true,
      message: 'Suspicious activity reported',
      data: sar,
    };
  }

  @Get('suspicious-activities')
  @ApiOperation({ summary: 'Get suspicious activities (Admin only)' })
  @ApiQuery({ name: 'status', required: false, enum: SARStatus })
  async getSuspiciousActivities(@Query('status') status?: SARStatus) {
    const activities = await this.transactionMonitoringService.getSuspiciousActivities(status);

    return {
      success: true,
      data: activities,
    };
  }

  @Post('sar/:sarId/report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report SAR to authorities (Admin only)' })
  async reportSARToAuthorities(@Param('sarId') sarId: string, @Request() req: any) {
    const reportedBy = req.user?.id || 'admin-id';

    const sar = await this.transactionMonitoringService.reportSARToAuthorities(sarId, reportedBy);

    return {
      success: true,
      message: 'SAR reported to authorities',
      data: sar,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get transaction monitoring statistics (Admin only)' })
  async getStats() {
    const stats = await this.transactionMonitoringService.getMonitoringStats();

    return {
      success: true,
      data: stats,
    };
  }
}
