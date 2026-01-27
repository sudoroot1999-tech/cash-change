import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TokenService } from '../services/token.service';
import { StakingService } from '../services/staking.service';
import { VestingService } from '../services/vesting.service';
import {
  StakeTokenDto,
  UnstakeTokenDto,
  ClaimRewardsDto,
  ClaimVestingDto,
  TokenBalanceResponse,
  TokenPriceResponse,
  TokenSupplyResponse,
  StakingRewardsResponse,
  VestingInfoResponse,
  FeeDiscountResponse,
} from '../dto/token.dto';

@ApiTags('Token')
@Controller('token')
export class TokenController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly stakingService: StakingService,
    private readonly vestingService: VestingService,
  ) {}

  @Get('price')
  @ApiOperation({ summary: 'Get current token price' })
  @ApiResponse({ status: 200, type: TokenPriceResponse })
  async getPrice(): Promise<TokenPriceResponse> {
    return this.tokenService.getCurrentPrice();
  }

  @Get('supply')
  @ApiOperation({ summary: 'Get token supply information' })
  @ApiResponse({ status: 200, type: TokenSupplyResponse })
  async getSupply(): Promise<TokenSupplyResponse> {
    return this.tokenService.getSupplyInfo();
  }

  @Get('balance/:userId')
  @ApiOperation({ summary: 'Get user token balance' })
  @ApiResponse({ status: 200, type: TokenBalanceResponse })
  async getBalance(
    @Param('userId') userId: string,
  ): Promise<TokenBalanceResponse> {
    return this.tokenService.getUserBalance(userId);
  }

  @Get('fee-discount/:userId')
  @ApiOperation({ summary: 'Get user fee discount information' })
  @ApiResponse({ status: 200, type: FeeDiscountResponse })
  async getFeeDiscount(
    @Param('userId') userId: string,
  ): Promise<FeeDiscountResponse> {
    return this.tokenService.getFeeDiscount(userId);
  }

  @Post('stake')
  @ApiOperation({ summary: 'Stake tokens' })
  @ApiResponse({ status: 201 })
  async stake(@Body() dto: StakeTokenDto, @Request() req) {
    return this.stakingService.stakeTokens(req.user.id, dto);
  }

  @Post('unstake')
  @ApiOperation({ summary: 'Unstake tokens' })
  @ApiResponse({ status: 200 })
  async unstake(@Body() dto: UnstakeTokenDto, @Request() req) {
    return this.stakingService.unstakeTokens(req.user.id, dto);
  }

  @Get('staking/:userId')
  @ApiOperation({ summary: 'Get user staking positions' })
  @ApiResponse({ status: 200, type: [StakingRewardsResponse] })
  async getStakingPositions(
    @Param('userId') userId: string,
  ): Promise<StakingRewardsResponse[]> {
    return this.stakingService.getUserStakingPositions(userId);
  }

  @Get('staking/:userId/rewards')
  @ApiOperation({ summary: 'Get user pending rewards' })
  @ApiResponse({ status: 200 })
  async getPendingRewards(@Param('userId') userId: string) {
    return this.stakingService.getUserPendingRewards(userId);
  }

  @Post('claim-rewards')
  @ApiOperation({ summary: 'Claim staking rewards' })
  @ApiResponse({ status: 200 })
  async claimRewards(@Body() dto: ClaimRewardsDto, @Request() req) {
    return this.stakingService.claimRewards(req.user.id, dto);
  }

  @Get('vesting/:userId')
  @ApiOperation({ summary: 'Get user vesting schedules' })
  @ApiResponse({ status: 200, type: [VestingInfoResponse] })
  async getVestingSchedules(
    @Param('userId') userId: string,
  ): Promise<VestingInfoResponse[]> {
    return this.vestingService.getUserVestingSchedules(userId);
  }

  @Post('claim-vesting')
  @ApiOperation({ summary: 'Claim vested tokens' })
  @ApiResponse({ status: 200 })
  async claimVesting(@Body() dto: ClaimVestingDto, @Request() req) {
    return this.vestingService.claimVestedTokens(req.user.id, dto);
  }

  @Get('transactions/:userId')
  @ApiOperation({ summary: 'Get user token transactions' })
  @ApiResponse({ status: 200 })
  async getTransactions(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.tokenService.getUserTransactions(userId, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get token statistics' })
  @ApiResponse({ status: 200 })
  async getStats() {
    return this.tokenService.getTokenStats();
  }

  @Get('burn-history')
  @ApiOperation({ summary: 'Get burn history' })
  @ApiResponse({ status: 200 })
  async getBurnHistory(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.tokenService.getBurnHistory(page, limit);
  }

  @Get('holders/top')
  @ApiOperation({ summary: 'Get top token holders' })
  @ApiResponse({ status: 200 })
  async getTopHolders(@Query('limit') limit: number = 100) {
    return this.tokenService.getTopHolders(limit);
  }

  @Get('distribution')
  @ApiOperation({ summary: 'Get token distribution info' })
  @ApiResponse({ status: 200 })
  async getDistribution() {
    return this.tokenService.getDistributionInfo();
  }
}
