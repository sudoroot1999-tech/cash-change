import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GamificationService } from './gamification.service';

@ApiTags('NFT Gamification')
@Controller('nft/gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('achievements')
  @ApiOperation({ summary: 'Get all achievements' })
  async getAllAchievements() {
    return await this.gamificationService.getAllAchievements();
  }

  @Get('my-achievements')
  @ApiOperation({ summary: 'Get user achievements' })
  async getUserAchievements(@Query('userAddress') userAddress: string) {
    return await this.gamificationService.getUserAchievements(userAddress);
  }

  @Post('achievements/create')
  @ApiOperation({ summary: 'Create new achievement (admin)' })
  async createAchievement(@Body() data: any) {
    return await this.gamificationService.createAchievement(data);
  }

  @Post('achievements/award')
  @ApiOperation({ summary: 'Award achievement to user (admin)' })
  async awardAchievement(@Body() data: any) {
    return await this.gamificationService.awardAchievement(
      data.achievementId,
      data.userAddress,
      data.nftId,
    );
  }
}
