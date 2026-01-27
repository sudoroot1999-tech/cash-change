import { Controller, Get, Post, Body, Param, Query, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto, BuyNftDto, UpdateListingPriceDto } from './dto/create-listing.dto';

@ApiTags('NFT Marketplace')
@Controller('nft')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post('list')
  @ApiOperation({ summary: 'List NFT for sale' })
  @ApiResponse({ status: 201, description: 'NFT listed successfully' })
  async listNFT(@Body() createListingDto: CreateListingDto) {
    return await this.marketplaceService.createListing(createListingDto);
  }

  @Post('buy/:listingId')
  @ApiOperation({ summary: 'Buy NFT from marketplace' })
  @ApiResponse({ status: 200, description: 'NFT purchased successfully' })
  async buyNFT(@Param('listingId') listingId: string, @Body() buyNftDto: BuyNftDto) {
    return await this.marketplaceService.buyNFT(
      listingId,
      buyNftDto.buyerAddress,
      buyNftDto.txHash,
    );
  }

  @Delete('listing/:listingId/cancel')
  @ApiOperation({ summary: 'Cancel NFT listing' })
  @ApiResponse({ status: 200, description: 'Listing cancelled' })
  async cancelListing(
    @Param('listingId') listingId: string,
    @Query('sellerAddress') sellerAddress: string,
  ) {
    return await this.marketplaceService.cancelListing(listingId, sellerAddress);
  }

  @Patch('listing/:listingId/price')
  @ApiOperation({ summary: 'Update listing price' })
  @ApiResponse({ status: 200, description: 'Price updated' })
  async updatePrice(
    @Param('listingId') listingId: string,
    @Body() updatePriceDto: UpdateListingPriceDto,
  ) {
    return await this.marketplaceService.updateListingPrice(
      listingId,
      updatePriceDto.sellerAddress,
      updatePriceDto.newPrice,
    );
  }

  @Get('listings')
  @ApiOperation({ summary: 'Get active listings' })
  @ApiResponse({ status: 200, description: 'Listings retrieved' })
  async getActiveListings(
    @Query('collectionId') collectionId?: string,
    @Query('sellerAddress') sellerAddress?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('chainId') chainId?: number,
    @Query('sortBy') sortBy?: 'price' | 'created_at',
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.marketplaceService.getActiveListings({
      collectionId,
      sellerAddress,
      minPrice,
      maxPrice,
      chainId: chainId ? Number(chainId) : undefined,
      sortBy,
      order,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('listing/:id')
  @ApiOperation({ summary: 'Get listing by ID' })
  @ApiResponse({ status: 200, description: 'Listing retrieved' })
  async getListing(@Param('id') id: string) {
    return await this.marketplaceService.getListing(id);
  }

  @Get('collection/:collectionId/floor-price')
  @ApiOperation({ summary: 'Get floor price for collection' })
  @ApiResponse({ status: 200, description: 'Floor price retrieved' })
  async getFloorPrice(@Param('collectionId') collectionId: string) {
    const floorPrice = await this.marketplaceService.getFloorPrice(collectionId);
    return { floorPrice };
  }
}
