import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PolicyManagementService } from '../services/policy-management.service';
import { AcceptPolicyDto, PolicyResponseDto, GetPolicyDto } from '../dto/policy.dto';
import { PolicyType } from '../entities/policy-acceptance.entity';
import { RequireAuth } from '@exchange/common';

@ApiTags('Policy Management')
@RequireAuth()
@Controller('compliance/policy')
export class PolicyController {
  constructor(private readonly policyManagementService: PolicyManagementService) { }

  @Get()
  @ApiOperation({ summary: 'Get policy by type' })
  @ApiResponse({ status: 200, type: PolicyResponseDto })
  async getPolicy(@Query('type') type: PolicyType) {
    const policy = await this.policyManagementService.getPolicy(type);

    return {
      success: true,
      data: {
        type: policy.type,
        version: policy.version,
        content: policy.content,
        effectiveDate: policy.effectiveDate,
        lastUpdated: policy.lastUpdated,
      },
    };
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a policy' })
  async acceptPolicy(@Body() dto: AcceptPolicyDto, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id';

    const acceptance = await this.policyManagementService.recordAcceptance(
      userId,
      dto.policyType,
      dto.policyVersion,
      req.ip,
      req.headers['user-agent'],
    );

    return {
      success: true,
      data: acceptance,
    };
  }

  @Get('acceptances')
  @ApiOperation({ summary: 'Get user policy acceptances' })
  async getUserAcceptances(@Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    const acceptances = await this.policyManagementService.getUserAcceptances(userId);

    return {
      success: true,
      data: acceptances,
    };
  }

  @Get('check-acceptance')
  @ApiOperation({ summary: 'Check if user has accepted a policy' })
  async checkAcceptance(@Query('type') type: PolicyType, @Request() req: any) {
    const userId = req.user?.id || 'test-user-id';
    const hasAccepted = await this.policyManagementService.hasAcceptedPolicy(userId, type);

    return {
      success: true,
      data: {
        policyType: type,
        hasAccepted,
      },
    };
  }
}
