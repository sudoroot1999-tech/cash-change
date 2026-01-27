import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query,
  Ip 
} from '@nestjs/common';
import { AirdropService } from './airdrop.service';
import { AirdropCampaign } from '../../entities/AirdropCampaign.entity';

@Controller('marketing/airdrop')
export class AirdropController {
  constructor(private readonly airdropService: AirdropService) {}

  @Post('campaigns')
  async createCampaign(@Body() data: Partial<AirdropCampaign>) {
    return this.airdropService.createCampaign(data);
  }

  @Put('campaigns/:id')
  async updateCampaign(
    @Param('id') id: string,
    @Body() data: Partial<AirdropCampaign>
  ) {
    return this.airdropService.updateCampaign(id, data);
  }

  @Post('campaigns/:id/snapshot')
  async takeSnapshot(
    @Param('id') id: string,
    @Body('userDataProvider') userDataProvider: any
  ) {
    await this.airdropService.takeSnapshot(id, userDataProvider);
    return { success: true, message: 'Snapshot completed' };
  }

  @Post('campaigns/:id/open-claiming')
  async openClaiming(@Param('id') id: string) {
    return this.airdropService.openClaiming(id);
  }

  @Post('campaigns/:id/claim')
  async claimAirdrop(
    @Param('id') campaignId: string,
    @Body('userId') userId: string,
    @Body('walletAddress') walletAddress: string,
    @Body('deviceFingerprint') deviceFingerprint: string,
    @Ip() ipAddress: string
  ) {
    return this.airdropService.claimAirdrop(
      campaignId,
      userId,
      walletAddress,
      ipAddress,
      deviceFingerprint
    );
  }

  @Post('campaigns/:id/process-vesting')
  async processVestingReleases(@Param('id') id: string) {
    await this.airdropService.processVestingReleases(id);
    return { success: true, message: 'Vesting releases processed' };
  }

  @Post('campaigns/:id/auto-distribute')
  async autoDistribute(@Param('id') id: string) {
    await this.airdropService.autoDistribute(id);
    return { success: true, message: 'Auto-distribution completed' };
  }

  @Get('campaigns/:id/analytics')
  async getAirdropAnalytics(@Param('id') id: string) {
    return this.airdropService.getAirdropAnalytics(id);
  }

  @Get('campaigns/:campaignId/user/:userId/allocation')
  async getUserAllocation(
    @Param('campaignId') campaignId: string,
    @Param('userId') userId: string
  ) {
    return this.airdropService.getUserAllocation(campaignId, userId);
  }
}
