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
import { StakingService } from '../services/staking.service';
import { StakeDto, UnstakeDto, ClaimRewardsDto, StakingPositionResponseDto } from '../dto/staking.dto';

@ApiTags('Staking')
@Controller('defi')
export class StakingController {
  constructor(private readonly stakingService: StakingService) {}

  @Post('stake')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Stake tokens (flexible or locked)' })
  @ApiResponse({ status: 201, description: 'Tokens staked successfully', type: StakingPositionResponseDto })
  async stake(@Request() req, @Body() stakeDto: StakeDto) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.stakingService.stake(userId, stakeDto);
  }

  @Post('unstake')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unstake tokens and claim rewards' })
  @ApiResponse({ status: 200, description: 'Tokens unstaked successfully', type: StakingPositionResponseDto })
  async unstake(@Request() req, @Body() unstakeDto: UnstakeDto) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.stakingService.unstake(userId, unstakeDto.positionId);
  }

  @Post('stake/claim-rewards')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim staking rewards' })
  @ApiResponse({ status: 200, description: 'Rewards claimed successfully' })
  async claimRewards(@Request() req, @Body() claimDto: ClaimRewardsDto) {
    const userId = req.user?.id || 'mock-user-id';
    const amount = await this.stakingService.claimRewards(userId, claimDto.positionId);
    return { success: true, rewardAmount: amount };
  }

  @Get('staking-positions')
  @ApiOperation({ summary: 'Get all staking positions for user' })
  @ApiResponse({ status: 200, description: 'Staking positions retrieved', type: [StakingPositionResponseDto] })
  async getStakingPositions(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.stakingService.getStakingPositions(userId);
  }

  @Get('staking-positions/:id')
  @ApiOperation({ summary: 'Get specific staking position' })
  @ApiResponse({ status: 200, description: 'Staking position retrieved', type: StakingPositionResponseDto })
  async getStakingPosition(@Request() req, @Param('id') positionId: string) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.stakingService.getStakingPosition(userId, positionId);
  }

  @Get('staking-positions/stats')
  @ApiOperation({ summary: 'Get total staking statistics' })
  @ApiResponse({ status: 200, description: 'Staking statistics retrieved' })
  async getStakingStats(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.stakingService.getTotalStaked(userId);
  }
}
