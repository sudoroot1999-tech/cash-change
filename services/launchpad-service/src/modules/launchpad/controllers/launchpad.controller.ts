import {
  Controller,
  Get,
  Post,
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
import { VestingService } from '../services/vesting.service';
import { WhitelistService } from '../services/whitelist.service';
import { StakingService } from '../services/staking.service';
import { ProjectQueryDto } from '../dto/query.dto';
import { ParticipateDto, WhitelistApplicationDto, ClaimTokensDto } from '../dto/participate.dto';

@ApiTags('Launchpad')
@Controller('launchpad')
export class LaunchpadController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly saleRoundService: SaleRoundService,
    private readonly allocationService: AllocationService,
    private readonly vestingService: VestingService,
    private readonly whitelistService: WhitelistService,
    private readonly stakingService: StakingService,
  ) {}

  @Get('projects')
  @ApiOperation({ summary: 'Get all launchpad projects' })
  @ApiResponse({ status: 200, description: 'Projects retrieved successfully' })
  async getProjects(@Query() query: ProjectQueryDto) {
    return this.projectService.findAll(query);
  }

  @Get('project/:id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({ status: 200, description: 'Project retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProject(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Get('sales/active')
  @ApiOperation({ summary: 'Get active sales' })
  @ApiResponse({ status: 200, description: 'Active sales retrieved successfully' })
  async getActiveSales() {
    return this.saleRoundService.getActiveSales();
  }

  @Get('sales/upcoming')
  @ApiOperation({ summary: 'Get upcoming sales' })
  @ApiResponse({ status: 200, description: 'Upcoming sales retrieved successfully' })
  async getUpcomingSales() {
    return this.saleRoundService.getUpcomingSales();
  }

  @Get('sale/:id')
  @ApiOperation({ summary: 'Get sale round by ID' })
  @ApiResponse({ status: 200, description: 'Sale round retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Sale round not found' })
  async getSaleRound(@Param('id') id: string) {
    const saleRound = await this.saleRoundService.findOne(id);
    const currentPrice = await this.saleRoundService.getCurrentPrice(id);
    
    return {
      ...saleRound,
      currentPrice,
    };
  }

  @Post('whitelist/apply')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply for whitelist' })
  @ApiResponse({ status: 201, description: 'Whitelist application submitted' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async applyWhitelist(
    @Body() applicationDto: WhitelistApplicationDto,
    @Request() req,
  ) {
    const userId = req.user?.id || 'mock-user-id'; // Replace with actual auth
    return this.whitelistService.apply(applicationDto, userId);
  }

  @Post('participate')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Participate in token sale' })
  @ApiResponse({ status: 201, description: 'Participation successful' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async participate(@Body() participateDto: ParticipateDto, @Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return this.allocationService.participate(participateDto, userId);
  }

  @Post('claim')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim tokens' })
  @ApiResponse({ status: 200, description: 'Tokens claimed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async claimTokens(@Body() claimDto: ClaimTokensDto, @Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return this.vestingService.claimTokens(
      claimDto.allocationId,
      userId,
      claimDto.walletAddress,
    );
  }

  @Get('my-allocations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user allocations' })
  @ApiResponse({ status: 200, description: 'Allocations retrieved successfully' })
  async getMyAllocations(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return this.allocationService.findByUser(userId);
  }

  @Get('my-vesting')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user vesting schedules' })
  @ApiResponse({ status: 200, description: 'Vesting schedules retrieved successfully' })
  async getMyVesting(@Request() req, @Query('projectId') projectId?: string) {
    const userId = req.user?.id || 'mock-user-id';
    return this.vestingService.getVestingSchedule(userId, projectId);
  }

  @Get('my-claims')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user claim history' })
  @ApiResponse({ status: 200, description: 'Claims retrieved successfully' })
  async getMyClaims(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return this.vestingService.getClaimHistory(userId);
  }

  @Get('pending-claims')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending claims' })
  @ApiResponse({ status: 200, description: 'Pending claims retrieved successfully' })
  async getPendingClaims(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return this.vestingService.getPendingClaims(userId);
  }

  @Get('my-staking')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user staking info' })
  @ApiResponse({ status: 200, description: 'Staking info retrieved successfully' })
  async getMyStaking(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return this.stakingService.getUserStaking(userId);
  }

  @Get('allocation/:saleRoundId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user allocation for specific sale round' })
  @ApiResponse({ status: 200, description: 'Allocation retrieved successfully' })
  async getAllocationForRound(
    @Param('saleRoundId') saleRoundId: string,
    @Request() req,
  ) {
    const userId = req.user?.id || 'mock-user-id';
    return this.allocationService.getUserAllocationForRound(userId, saleRoundId);
  }

  @Get('whitelist-status/:saleRoundId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check whitelist status for sale round' })
  @ApiResponse({ status: 200, description: 'Whitelist status retrieved successfully' })
  async getWhitelistStatus(
    @Param('saleRoundId') saleRoundId: string,
    @Request() req,
  ) {
    const userId = req.user?.id || 'mock-user-id';
    return this.whitelistService.findByUserAndRound(userId, saleRoundId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get launchpad statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    const [projectStats, saleStats] = await Promise.all([
      this.projectService.getStats(),
      this.saleRoundService.getStats(),
    ]);

    return {
      projects: projectStats,
      sales: saleStats,
    };
  }
}
