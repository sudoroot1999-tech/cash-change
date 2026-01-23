import {
  Controller,
  Get,
  Query,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditTrailService } from '../services/audit-trail.service';
import { AuditLogAction } from '../entities/audit-log.entity';
import { RequireAuth } from '@exchange/common';

@ApiTags('Audit Trail')
@RequireAuth()
@Controller('compliance/audit-logs')
export class AuditController {
  constructor(private readonly auditTrailService: AuditTrailService) { }

  @Get()
  @ApiOperation({ summary: 'Get user audit logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getUserAuditLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Request() req?: any,
  ) {
    const userId = req.user?.id || 'test-user-id';
    const result = await this.auditTrailService.getUserAuditLogs(
      userId,
      limit ? parseInt(limit, 10) : 100,
      offset ? parseInt(offset, 10) : 0,
    );

    return {
      success: true,
      data: result.logs,
      total: result.total,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search audit logs (Admin only)' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, enum: AuditLogAction })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async searchAuditLogs(
    @Query('userId') userId?: string,
    @Query('action') action?: AuditLogAction,
    @Query('resource') resource?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: any = {};
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (resource) filters.resource = resource;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);

    const result = await this.auditTrailService.searchAuditLogs(filters);

    return {
      success: true,
      data: result.logs,
      total: result.total,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit statistics (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const stats = await this.auditTrailService.getAuditStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      success: true,
      data: stats,
    };
  }

  @Get('suspicious-logins')
  @ApiOperation({ summary: 'Get suspicious login attempts (Admin only)' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async getSuspiciousLogins(@Query('hours') hours?: string) {
    const hoursInt = hours ? parseInt(hours, 10) : 24;
    const logins = await this.auditTrailService.getSuspiciousLogins(hoursInt);

    return {
      success: true,
      data: logins,
    };
  }

  @Get('admin-actions')
  @ApiOperation({ summary: 'Get admin actions log (Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAdminActions(@Query('limit') limit?: string) {
    const limitInt = limit ? parseInt(limit, 10) : 100;
    const actions = await this.auditTrailService.getAdminActions(limitInt);

    return {
      success: true,
      data: actions,
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export audit logs (Admin only)' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  async exportLogs(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format?: 'json' | 'csv',
  ) {
    const exportData = await this.auditTrailService.exportAuditLogs(
      new Date(startDate),
      new Date(endDate),
      format || 'json',
    );

    return {
      success: true,
      data: exportData,
    };
  }
}
