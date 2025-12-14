import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AssetsService } from './assets.service';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all supported assets' })
  async findAll() {
    return { data: await this.assetsService.findAll() };
  }

  @Get(':symbol')
  @ApiOperation({ summary: 'Get asset by symbol' })
  async findBySymbol(@Param('symbol') symbol: string) {
    return this.assetsService.findBySymbol(symbol);
  }
}
