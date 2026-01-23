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
import { GDPRService } from '../services/gdpr.service';
import { CreateGDPRRequestDto, ProcessGDPRRequestDto, DataExportResponseDto } from '../dto/gdpr.dto';
import { AuditTrailService } from '../services/audit-trail.service';
import { AuditLogAction } from '../entities/audit-log.entity';
import { RequireAuth } from '@exchange/common';

@ApiTags('GDPR')
@RequireAuth()
@Controller('compliance/gdpr')
export class GDPRController {
  constructor(
    private readonly gdprService: GDPRService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  @Post('request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create GDPR request' })
  async createRequest(@Body() dto: CreateGDPRRequestDto, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id';

    const request = await this.gdprService.createGDPRRequest(
      userId,
      dto.type,
      dto.reason,
      dto.details,
    );

    return {
      success: true,
      data: request,
    };
  }

  @Post('export-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request data export (Right to Data Portability)' })
  @ApiResponse({ status: 200, type: DataExportResponseDto })
  async exportData(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';

    const request = await this.gdprService.exportUserData(userId);

    await this.auditTrailService.logAction({
      userId,
      action: AuditLogAction.DATA_EXPORT_REQUEST,
      resource: 'gdpr',
      resourceId: request.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      success: true,
      data: {
        requestId: request.id,
        status: request.status,
        exportUrl: request.exportUrl,
        exportExpiresAt: request.exportExpiresAt,
        createdAt: request.createdAt,
      },
    };
  }

  @Post('delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request account deletion (Right to be Forgotten)' })
  async deleteAccount(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';

    const request = await this.gdprService.deleteUserAccount(userId);

    await this.auditTrailService.logAction({
      userId,
      action: AuditLogAction.DATA_DELETE_REQUEST,
      resource: 'gdpr',
      resourceId: request.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      success: true,
      message: 'Account deletion request submitted',
      data: request,
    };
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get user GDPR requests' })
  async getUserRequests(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    const requests = await this.gdprService.getUserGDPRRequests(userId);

    return {
      success: true,
      data: requests,
    };
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending GDPR requests (Admin only)' })
  async getPendingRequests() {
    const requests = await this.gdprService.getPendingRequests();

    return {
      success: true,
      data: requests,
    };
  }

  @Post('consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track privacy consent' })
  async trackConsent(
    @Body() body: { consentType: string; granted: boolean },
    @Request() req: any,
  ) {
    const userId = req.user?.id || 'test-user-id';

    await this.gdprService.trackPrivacyConsent(userId, body.consentType, body.granted);

    return {
      success: true,
      message: 'Consent tracked',
    };
  }
}
