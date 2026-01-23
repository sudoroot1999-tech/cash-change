import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AffiliateService } from '../services';
import {
  CreateAffiliateCampaignDto,
  UpdateAffiliateCampaignDto,
  AffiliateApplicationDto,
  TrackClickDto,
} from '../dto';
import { AdminGuard, RequireAuth } from '@exchange/common';

@ApiTags('Affiliate')
@Controller('affiliate')
@RequireAuth()
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Post('apply')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply for affiliate program' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  @ApiResponse({ status: 403, description: 'Does not meet minimum requirements' })
  async applyForAffiliate(@Request() req, @Body() dto: AffiliateApplicationDto) {
    return await this.affiliateService.submitApplication(req.user.userId, dto);
  }

  @Post('campaigns')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create affiliate campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  async createCampaign(@Request() req, @Body() dto: CreateAffiliateCampaignDto) {
    return await this.affiliateService.createCampaign(req.user.userId, dto);
  }

  @Get('campaigns')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user affiliate campaigns' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  async getCampaigns(@Request() req) {
    return await this.affiliateService.getUserCampaigns(req.user.userId);
  }

  @Get('campaigns/:campaignId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaign details' })
  @ApiResponse({ status: 200, description: 'Campaign details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaign(@Request() req, @Param('campaignId') campaignId: string) {
    return await this.affiliateService.getCampaign(campaignId, req.user.userId);
  }

  @Put('campaigns/:campaignId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async updateCampaign(
    @Request() req,
    @Param('campaignId') campaignId: string,
    @Body() dto: UpdateAffiliateCampaignDto,
  ) {
    return await this.affiliateService.updateCampaign(campaignId, req.user.userId, dto);
  }

  @Get('campaigns/:campaignId/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaign statistics' })
  @ApiResponse({ status: 200, description: 'Campaign stats retrieved successfully' })
  async getCampaignStats(
    @Request() req,
    @Param('campaignId') campaignId: string,
  ) {
    return await this.affiliateService.getCampaignStats(
      campaignId,
      req.user.userId,
    );
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get affiliate overall statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getAffiliateStats(@Request() req) {
    return await this.affiliateService.getAffiliateStats(req.user.userId);
  }

  @Post('track/click')
  @ApiOperation({ summary: 'Track affiliate click' })
  @ApiResponse({ status: 200, description: 'Click tracked successfully' })
  async trackClick(@Body() dto: TrackClickDto) {
    await this.affiliateService.trackClick(dto.trackingId);
    return { success: true };
  }

  // Admin endpoints
  @Get('admin/campaigns')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all campaigns (admin)' })
  @ApiResponse({ status: 200, description: 'All campaigns retrieved successfully' })
  async getAllCampaigns(@Query('status') status?: string) {
    return await this.affiliateService.getAllCampaigns(status);
  }

  @Post('admin/campaigns/:campaignId/approve')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve campaign (admin)' })
  @ApiResponse({ status: 200, description: 'Campaign approved successfully' })
  async approveCampaign(@Request() req, @Param('campaignId') campaignId: string) {
    return await this.affiliateService.approveCampaign(campaignId, req.user.userId);
  }

  @Post('admin/campaigns/:campaignId/reject')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject campaign (admin)' })
  @ApiResponse({ status: 200, description: 'Campaign rejected successfully' })
  async rejectCampaign(
    @Request() req,
    @Param('campaignId') campaignId: string,
    @Body('reason') reason: string,
  ) {
    return await this.affiliateService.rejectCampaign(campaignId, req.user.userId, reason);
  }
}
