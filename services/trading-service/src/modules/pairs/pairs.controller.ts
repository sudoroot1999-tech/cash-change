import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PairsService } from './pairs.service';

@ApiTags('Trading Pairs')
@Controller('pairs')
export class PairsController {
  constructor(private readonly pairsService: PairsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all trading pairs' })
  async findAll() {
    return { data: await this.pairsService.findAll() };
  }

  @Get(':symbol')
  @ApiOperation({ summary: 'Get trading pair by symbol' })
  async findBySymbol(@Param('symbol') symbol: string) {
    return this.pairsService.findBySymbol(symbol);
  }
}
