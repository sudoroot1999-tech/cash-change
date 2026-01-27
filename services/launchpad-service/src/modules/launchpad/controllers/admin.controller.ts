import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectService } from '../services/project.service';
import { SaleRoundService } from '../services/sale-round.service';
import { AllocationService } from '../services/allocation.service';
import { WhitelistService } from '../services/whitelist.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto, UpdateProjectStatusDto } from '../dto/update-project.dto';
import { CreateSaleRoundDto } from '../dto/create-sale-round.dto';
import { SaleStatus } from '../entities/sale-round.entity';

@ApiTags('Admin - Launchpad')
@Controller('admin/launchpad')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly saleRoundService: SaleRoundService,
    private readonly allocationService: AllocationService,
    private readonly whitelistService: WhitelistService,
  ) {}

  // Project Management
  @Post('projects')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async createProject(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    const userId = req.user?.id || 'admin-user-id';
    return this.projectService.create(createProjectDto, userId);
  }

  @Put('projects/:id')
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  async updateProject(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req,
  ) {
    const userId = req.user?.id || 'admin-user-id';
    return this.projectService.update(id, updateProjectDto, userId);
  }

  @Put('projects/:id/status')
  @ApiOperation({ summary: 'Update project status' })
  @ApiResponse({ status: 200, description: 'Project status updated successfully' })
  async updateProjectStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateProjectStatusDto,
    @Request() req,
  ) {
    const adminId = req.user?.id || 'admin-user-id';
    return this.projectService.updateStatus(id, updateStatusDto, adminId);
  }

  @Post('projects/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve project' })
  @ApiResponse({ status: 200, description: 'Project approved successfully' })
  async approveProject(@Param('id') id: string, @Request() req) {
    const adminId = req.user?.id || 'admin-user-id';
    return this.projectService.approve(id, adminId);
  }

  @Post('projects/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject project' })
  @ApiResponse({ status: 200, description: 'Project rejected successfully' })
  async rejectProject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    const adminId = req.user?.id || 'admin-user-id';
    return this.projectService.reject(id, adminId, reason);
  }

  @Put('projects/:id/featured')
  @ApiOperation({ summary: 'Set project featured status' })
  @ApiResponse({ status: 200, description: 'Featured status updated successfully' })
  async setFeatured(
    @Param('id') id: string,
    @Body('featured') featured: boolean,
  ) {
    return this.projectService.setFeatured(id, featured);
  }

  @Delete('projects/:id')
  @ApiOperation({ summary: 'Delete project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  async deleteProject(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || 'admin-user-id';
    return this.projectService.delete(id, userId);
  }

  // Sale Round Management
  @Post('sale-rounds')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new sale round' })
  @ApiResponse({ status: 201, description: 'Sale round created successfully' })
  async createSaleRound(@Body() createSaleRoundDto: CreateSaleRoundDto) {
    return this.saleRoundService.create(createSaleRoundDto);
  }

  @Put('sale-rounds/:id/status')
  @ApiOperation({ summary: 'Update sale round status' })
  @ApiResponse({ status: 200, description: 'Sale round status updated successfully' })
  async updateSaleStatus(
    @Param('id') id: string,
    @Body('status') status: SaleStatus,
  ) {
    return this.saleRoundService.updateStatus(id, status);
  }

  // Whitelist Management
  @Get('whitelists/:saleRoundId')
  @ApiOperation({ summary: 'Get whitelist entries for sale round' })
  @ApiResponse({ status: 200, description: 'Whitelist entries retrieved successfully' })
  async getWhitelist(@Param('saleRoundId') saleRoundId: string) {
    return this.whitelistService.findByRound(saleRoundId);
  }

  @Post('whitelists/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve whitelist entry' })
  @ApiResponse({ status: 200, description: 'Whitelist entry approved successfully' })
  async approveWhitelist(@Param('id') id: string, @Request() req) {
    const adminId = req.user?.id || 'admin-user-id';
    return this.whitelistService.approve(id, adminId);
  }

  @Post('whitelists/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject whitelist entry' })
  @ApiResponse({ status: 200, description: 'Whitelist entry rejected successfully' })
  async rejectWhitelist(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    const adminId = req.user?.id || 'admin-user-id';
    return this.whitelistService.reject(id, adminId, reason);
  }

  @Post('whitelists/:saleRoundId/auto-approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto-approve eligible whitelist entries' })
  @ApiResponse({ status: 200, description: 'Whitelist entries auto-approved' })
  async autoApproveWhitelist(@Param('saleRoundId') saleRoundId: string) {
    const count = await this.whitelistService.autoApprove(saleRoundId);
    return { approved: count };
  }

  @Post('whitelists/bulk-approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk approve whitelist entries' })
  @ApiResponse({ status: 200, description: 'Whitelist entries approved' })
  async bulkApproveWhitelist(
    @Body('ids') ids: string[],
    @Request() req,
  ) {
    const adminId = req.user?.id || 'admin-user-id';
    await this.whitelistService.bulkApprove(ids, adminId);
    return { success: true };
  }

  // Lottery Management
  @Post('sale-rounds/:id/run-lottery')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run lottery for oversubscribed sale' })
  @ApiResponse({ status: 200, description: 'Lottery completed successfully' })
  async runLottery(@Param('id') id: string) {
    await this.allocationService.runLottery(id);
    return { success: true };
  }

  // Analytics
  @Get('analytics/projects')
  @ApiOperation({ summary: 'Get project analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getProjectAnalytics() {
    return this.projectService.getStats();
  }

  @Get('analytics/sales')
  @ApiOperation({ summary: 'Get sales analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getSalesAnalytics(@Query('projectId') projectId?: string) {
    return this.saleRoundService.getStats(projectId);
  }

  @Get('analytics/whitelists')
  @ApiOperation({ summary: 'Get whitelist analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getWhitelistAnalytics(@Query('saleRoundId') saleRoundId?: string) {
    return this.whitelistService.getStats(saleRoundId);
  }

  @Get('analytics/allocations')
  @ApiOperation({ summary: 'Get allocation analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAllocationAnalytics(@Query('userId') userId?: string) {
    return this.allocationService.getStats(userId);
  }
}
