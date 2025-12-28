import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../auth/entities/admin.entity';

@ApiTags('Admin - Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Roles(
    AdminRole.SUPER_ADMIN,
    AdminRole.SUPPORT_ADMIN,
    AdminRole.FINANCE_ADMIN,
    AdminRole.COMPLIANCE_ADMIN,
  )
  @ApiOperation({ summary: 'Get dashboard overview statistics' })
  async getOverview() {
    return this.dashboardService.getOverview();
  }
}

