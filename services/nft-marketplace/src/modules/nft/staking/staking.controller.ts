import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StakingService } from './staking.service';

@ApiTags('NFT Staking')
@Controller('nft/staking')
export class StakingController {
  constructor(private readonly stakingService: StakingService) {}

  @Post('stake')
  @ApiOperation({ summary: 'Stake NFT to earn rewards' })
  async stakeNFT(@Body() data: any) {
    return await this.stakingService.stakeNFT(data.nftId, data.stakerAddress, data.poolId, data.chainId);
  }

  @Post(':stakingId/unstake')
  @ApiOperation({ summary: 'Unstake NFT' })
  async unstakeNFT(@Param('stakingId') stakingId: string) {
    return await this.stakingService.unstakeNFT(stakingId);
  }

  @Post(':stakingId/claim')
  @ApiOperation({ summary: 'Claim staking rewards' })
  async claimRewards(@Param('stakingId') stakingId: string) {
    return await this.stakingService.claimRewards(stakingId);
  }

  @Get('my-stakes')
  @ApiOperation({ summary: 'Get user staked NFTs' })
  async getUserStakes(@Query('stakerAddress') stakerAddress: string) {
    return await this.stakingService.getUserStakes(stakerAddress);
  }
}
