import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdService } from '../services/ad.service';
import { CreateAdDto } from '../dto/create-ad.dto';
import { UpdateAdDto } from '../dto/update-ad.dto';
import { SearchAdsDto } from '../dto/search-ads.dto';

@ApiTags('P2P Ads')
@Controller('p2p/ads')
export class AdController {
  constructor(private adService: AdService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new P2P ad' })
  @ApiResponse({ status: 201, description: 'Ad created successfully' })
  async createAd(@Body() dto: CreateAdDto, @Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id']; // Support both auth methods
    return this.adService.createAd(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Search and filter P2P ads' })
  @ApiResponse({ status: 200, description: 'Ads retrieved successfully' })
  async searchAds(@Query() dto: SearchAdsDto) {
    return this.adService.searchAds(dto);
  }

  @Get('my-ads')
  @ApiOperation({ summary: 'Get current user ads' })
  @ApiResponse({ status: 200, description: 'User ads retrieved successfully' })
  async getMyAds(@Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.adService.getUserAds(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ad by ID' })
  @ApiResponse({ status: 200, description: 'Ad retrieved successfully' })
  async getAdById(@Param('id') id: string) {
    return this.adService.getAdById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update ad' })
  @ApiResponse({ status: 200, description: 'Ad updated successfully' })
  async updateAd(@Param('id') id: string, @Body() dto: UpdateAdDto, @Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.adService.updateAd(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete ad' })
  @ApiResponse({ status: 200, description: 'Ad deleted successfully' })
  async deleteAd(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    await this.adService.deleteAd(id, userId);
    return { message: 'Ad deleted successfully' };
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause ad' })
  @ApiResponse({ status: 200, description: 'Ad paused successfully' })
  async pauseAd(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.adService.pauseAd(id, userId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate ad' })
  @ApiResponse({ status: 200, description: 'Ad activated successfully' })
  async activateAd(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.adService.activateAd(id, userId);
  }

  @Post(':id/blacklist')
  @ApiOperation({ summary: 'Add user to ad blacklist' })
  @ApiResponse({ status: 200, description: 'User added to blacklist' })
  async addToBlacklist(
    @Param('id') id: string,
    @Body('userId') blockedUserId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.adService.addToBlacklist(id, userId, blockedUserId);
  }

  @Delete(':id/blacklist/:userId')
  @ApiOperation({ summary: 'Remove user from ad blacklist' })
  @ApiResponse({ status: 200, description: 'User removed from blacklist' })
  async removeFromBlacklist(
    @Param('id') id: string,
    @Param('userId') unblockedUserId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.adService.removeFromBlacklist(id, userId, unblockedUserId);
  }
}
