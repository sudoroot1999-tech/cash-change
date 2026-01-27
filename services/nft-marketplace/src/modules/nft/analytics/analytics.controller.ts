import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('NFT Analytics')
@Controller('nft/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('nft/:nftId/price-history')
  @ApiOperation({ summary: 'Get NFT price history' })
  async getPriceHistory(@Param('nftId') nftId: string) {
    return await this.analyticsService.getPriceHistory(nftId);
  }

  @Get('collection/:collectionId')
  @ApiOperation({ summary: 'Get collection analytics' })
  async getCollectionAnalytics(
    @Param('collectionId') collectionId: string,
    @Query('days') days?: number,
  ) {
    return await this.analyticsService.getCollectionAnalytics(
      collectionId,
      days ? Number(days) : 30,
    );
  }

  @Get('marketplace/stats')
  @ApiOperation({ summary: 'Get marketplace statistics' })
  async getMarketplaceStats() {
    return await this.analyticsService.getMarketplaceStats();
  }
}
