import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NftsService } from './nfts.service';
import { MintNftDto, CreateLazyMintDto } from './dto/mint-nft.dto';

@ApiTags('NFT Minting')
@Controller('nft')
export class NftsController {
  constructor(private readonly nftsService: NftsService) {}

  @Post('mint')
  @ApiOperation({ summary: 'Mint a new NFT' })
  @ApiResponse({ status: 201, description: 'NFT minted successfully' })
  async mintNFT(@Body() mintNftDto: MintNftDto) {
    return await this.nftsService.mintNFT(mintNftDto);
  }

  @Post('lazy-mint')
  @ApiOperation({ summary: 'Create lazy mint voucher' })
  @ApiResponse({ status: 201, description: 'Lazy mint voucher created' })
  async createLazyMint(@Body() createLazyMintDto: CreateLazyMintDto) {
    return await this.nftsService.createLazyMintVoucher(createLazyMintDto);
  }

  @Get('my-nfts')
  @ApiOperation({ summary: 'Get NFTs owned by address' })
  @ApiResponse({ status: 200, description: 'NFTs retrieved successfully' })
  async getMyNFTs(
    @Query('ownerAddress') ownerAddress: string,
    @Query('chainId') chainId?: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.nftsService.findAll({
      ownerAddress,
      chainId: chainId ? Number(chainId) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending NFTs' })
  @ApiResponse({ status: 200, description: 'Trending NFTs retrieved' })
  async getTrendingNFTs(
    @Query('chainId') chainId?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.nftsService.getTrendingNFTs(
      chainId ? Number(chainId) : undefined,
      limit ? Number(limit) : 10,
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search NFTs' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchNFTs(
    @Query('q') searchTerm: string,
    @Query('limit') limit?: number,
  ) {
    return await this.nftsService.searchNFTs(searchTerm, limit ? Number(limit) : 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get NFT by ID' })
  @ApiResponse({ status: 200, description: 'NFT retrieved successfully' })
  async getNFT(@Param('id') id: string) {
    const nft = await this.nftsService.findOne(id);
    
    // Increment view count
    await this.nftsService.incrementViews(id);
    
    return nft;
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get NFT transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved' })
  async getTransactionHistory(@Param('id') id: string) {
    return await this.nftsService.getTransactionHistory(id);
  }

  @Patch(':id/refresh-metadata')
  @ApiOperation({ summary: 'Refresh NFT metadata from IPFS' })
  @ApiResponse({ status: 200, description: 'Metadata refreshed' })
  async refreshMetadata(@Param('id') id: string) {
    return await this.nftsService.updateNFTMetadata(id);
  }

  @Post('collection/:collectionId/calculate-rarity')
  @ApiOperation({ summary: 'Calculate rarity scores for collection' })
  @ApiResponse({ status: 200, description: 'Rarity calculated' })
  async calculateRarity(@Param('collectionId') collectionId: string) {
    await this.nftsService.calculateRarityScore(collectionId);
    return { message: 'Rarity scores calculated successfully' };
  }
}
