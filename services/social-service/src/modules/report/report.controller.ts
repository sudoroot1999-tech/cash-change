import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { ReportReason, ReportStatus, ReportTargetType } from '../../database/entities';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles, Role } from '../../common/decorators';
import { PaginationDto } from '../../common/dto';

@ApiTags('reports')
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a report' })
  create(@CurrentUser('userId') reporterId: string, @Body() body: { targetType: ReportTargetType; targetId: string; reason: ReportReason; description?: string; evidenceUrls?: string[] }) {
    return this.reportService.create(reporterId, body);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my reports' })
  getMyReports(@CurrentUser('userId') reporterId: string, @Query() pagination: PaginationDto) {
    return this.reportService.getMyReports(reporterId, pagination);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending reports (moderator/admin)' })
  getPending(@Query() pagination: PaginationDto) {
    return this.reportService.getPendingReports(pagination);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get report by ID' })
  @ApiParam({ name: 'id' })
  findById(@Param('id') id: string) {
    return this.reportService.findById(id);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update report status (moderator/admin)' })
  @ApiParam({ name: 'id' })
  updateStatus(@Param('id') id: string, @CurrentUser('userId') reviewerId: string, @Body() body: { status: ReportStatus; resolution?: string }) {
    return this.reportService.updateStatus(id, reviewerId, body.status, body.resolution);
  }
}
