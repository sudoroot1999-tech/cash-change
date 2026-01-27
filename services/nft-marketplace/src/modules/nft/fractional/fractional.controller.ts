import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FractionalService } from './fractional.service';

@ApiTags('NFT Fractionalization')
@Controller('nft/fractional')
export class FractionalController {
  constructor(private readonly fractionalService: FractionalService) {}

  @Post('fractionalize')
  @ApiOperation({ summary: 'Fractionalize NFT into ERC-20 tokens' })
  async fractionalizeNFT(@Body() data: any) {
    return await this.fractionalService.fractionalizeNFT(data.nftId, data.totalFractions, data.ownerAddress);
  }

  @Post(':vaultId/redeem')
  @ApiOperation({ summary: 'Redeem NFT by burning all fractions' })
  async redeemNFT(@Param('vaultId') vaultId: string, @Body() data: any) {
    return await this.fractionalService.redeemNFT(vaultId, data.ownerAddress);
  }

  @Get(':vaultId/owners')
  @ApiOperation({ summary: 'Get fraction owners' })
  async getFractionOwners(@Param('vaultId') vaultId: string) {
    return await this.fractionalService.getFractionOwners(vaultId);
  }
}
