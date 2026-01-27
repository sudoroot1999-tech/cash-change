import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';

@ApiTags('NFT Collections')
@Controller('nft/collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new NFT collection' })
  @ApiResponse({ status: 201, description: 'Collection created successfully' })
  async createCollection(@Body() createCollectionDto: CreateCollectionDto) {
    return await this.collectionsService.createCollection(createCollectionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all NFT collections' })
  @ApiResponse({ status: 200, description: 'Collections retrieved successfully' })
  async getAllCollections(
    @Query('chainId') chainId?: number,
    @Query('category') category?: string,
    @Query('creatorAddress') creatorAddress?: string,
    @Query('isVerified') isVerified?: boolean,
    @Query('sortBy') sortBy?: 'volume' | 'floor_price' | 'created_at',
    @Query('order') order?: 'ASC' | 'DESC',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.collectionsService.findAll({
      chainId: chainId ? Number(chainId) : undefined,
      category,
      creatorAddress,
      isVerified,
      sortBy,
      order,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending collections' })
  @ApiResponse({ status: 200, description: 'Trending collections retrieved' })
  async getTrendingCollections(
    @Query('chainId') chainId?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.collectionsService.getTrendingCollections(
      chainId ? Number(chainId) : undefined,
      limit ? Number(limit) : 10,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get collection by ID' })
  @ApiResponse({ status: 200, description: 'Collection retrieved successfully' })
  async getCollection(@Param('id') id: string) {
    return await this.collectionsService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get collection statistics' })
  @ApiResponse({ status: 200, description: 'Collection stats retrieved' })
  async getCollectionStats(@Param('id') id: string) {
    return await this.collectionsService.getCollectionStats(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update collection' })
  @ApiResponse({ status: 200, description: 'Collection updated successfully' })
  async updateCollection(
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    return await this.collectionsService.updateCollection(id, updateData);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verify/unverify collection (admin only)' })
  @ApiResponse({ status: 200, description: 'Collection verification updated' })
  async verifyCollection(
    @Param('id') id: string,
    @Body('isVerified') isVerified: boolean,
  ) {
    return await this.collectionsService.verifyCollection(id, isVerified);
  }
}
