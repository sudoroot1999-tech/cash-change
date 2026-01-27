import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StakingService } from '../services/staking.service';

class StakeDto {
  amount!: string;
}

@ApiTags('Staking')
@Controller('staking')
@ApiBearerAuth()
export class StakingController {
  constructor(private readonly stakingService: StakingService) {}

  @Post('stake')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Stake platform tokens' })
  @ApiResponse({ status: 201, description: 'Tokens staked successfully' })
  async stake(@Body() stakeDto: StakeDto, @Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return this.stakingService.stake(userId, stakeDto.amount);
  }

  @Post('unstake/:stakingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request to unstake tokens' })
  @ApiResponse({ status: 200, description: 'Unstake request submitted' })
  async requestUnstake(@Param('stakingId') stakingId: string, @Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return this.stakingService.requestUnstake(userId, stakingId);
  }

  @Post('complete-unstake/:stakingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete unstaking' })
  @ApiResponse({ status: 200, description: 'Unstaking completed' })
  async completeUnstake(@Param('stakingId') stakingId: string, @Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return this.stakingService.completeUnstake(userId, stakingId);
  }

  @Get('my-staking')
  @ApiOperation({ summary: 'Get user staking info' })
  @ApiResponse({ status: 200, description: 'Staking info retrieved successfully' })
  async getMyStaking(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return this.stakingService.getUserStaking(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get staking history' })
  @ApiResponse({ status: 200, description: 'Staking history retrieved successfully' })
  async getHistory(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return this.stakingService.getUserStakingHistory(userId);
  }

  @Get('tier')
  @ApiOperation({ summary: 'Get user tier' })
  @ApiResponse({ status: 200, description: 'User tier retrieved successfully' })
  async getUserTier(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    const tier = await this.stakingService.getUserTier(userId);
    return { tier };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get staking statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    return this.stakingService.getStats();
  }
}
