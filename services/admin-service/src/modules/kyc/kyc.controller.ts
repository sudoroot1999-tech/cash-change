import { Controller, Get, Param, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../auth/entities/admin.entity';

@ApiTags('Admin - KYC')
@Controller('kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'List all KYC requests' })
  async findAll(@Query() query: any) {
    return this.kycService.findAll(query);
  }

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'Get KYC statistics' })
  async getStats() {
    return this.kycService.getKycStats();
  }

  @Get(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'Get KYC request by ID' })
  async findById(@Param('id') id: string) {
    return this.kycService.findById(id);
  }

  @Post(':id/review')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'Review KYC request (approve/reject)' })
  async reviewKyc(
    @Param('id') id: string,
    @Body() body: { decision: 'approved' | 'rejected'; notes?: string },
  ) {
    return this.kycService.reviewKyc(id, body.decision, body.notes);
  }
}
