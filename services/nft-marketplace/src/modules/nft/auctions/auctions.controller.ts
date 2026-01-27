import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuctionsService } from './auctions.service';

@ApiTags('NFT Auctions')
@Controller('nft/auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Post('create-auction')
  @ApiOperation({ summary: 'Create NFT auction (English or Dutch)' })
  async createAuction(@Body() data: any) {
    return await this.auctionsService.createAuction(data);
  }

  @Post('bid')
  @ApiOperation({ summary: 'Place bid on auction' })
  async placeBid(@Body() data: any) {
    return await this.auctionsService.placeBid(data.auctionId, data.bidderAddress, data.amount);
  }

  @Post(':auctionId/end')
  @ApiOperation({ summary: 'End auction' })
  async endAuction(@Param('auctionId') auctionId: string) {
    return await this.auctionsService.endAuction(auctionId);
  }
}
