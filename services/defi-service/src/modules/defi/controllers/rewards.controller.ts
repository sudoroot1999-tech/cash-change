import {
  Controller,
  Get,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RewardsService } from '../services/rewards.service';
import { RewardHistoryResponseDto, TotalRewardsResponseDto } from '../dto/rewards.dto';
import { RewardType } from '../entities/reward-history.entity';

@ApiTags('Rewards')
@Controller('defi')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('rewards')
  @ApiOperation({ summary: 'Get reward history for user' })
  @ApiQuery({ name: 'type', required: false, enum: RewardType })
  @ApiResponse({ status: 200, description: 'Reward history retrieved', type: [RewardHistoryResponseDto] })
  async getRewards(@Request() req, @Query('type') type?: RewardType) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.rewardsService.getRewardHistory(userId, type);
  }

  @Get('rewards/total')
  @ApiOperation({ summary: 'Get total rewards earned by user' })
  @ApiResponse({ status: 200, description: 'Total rewards retrieved', type: TotalRewardsResponseDto })
  async getTotalRewards(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.rewardsService.getTotalRewards(userId);
  }

  @Get('rewards/pending')
  @ApiOperation({ summary: 'Get pending rewards for user' })
  @ApiResponse({ status: 200, description: 'Pending rewards retrieved' })
  async getPendingRewards(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.rewardsService.getPendingRewards(userId);
  }

  @Get('rewards/by-asset')
  @ApiOperation({ summary: 'Get rewards breakdown by asset' })
  @ApiResponse({ status: 200, description: 'Rewards by asset retrieved' })
  async getRewardsByAsset(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    const rewardsMap = await this.rewardsService.getRewardsByAsset(userId);
    
    // Convert Map to object for JSON response
    const rewards: any = {};
    rewardsMap.forEach((value, key) => {
      rewards[key] = value;
    });
    
    return { rewardsByAsset: rewards };
  }
}
