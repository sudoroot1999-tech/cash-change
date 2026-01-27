import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TradeService } from '../services/trade.service';
import { InitiateTradeDto } from '../dto/initiate-trade.dto';
import { PaymentMadeDto } from '../dto/payment-made.dto';
import { TradeStatus } from '../entities/p2p-trade.entity';

@ApiTags('P2P Trades')
@Controller('p2p/trade')
export class TradeController {
  constructor(private tradeService: TradeService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a new trade' })
  @ApiResponse({ status: 201, description: 'Trade initiated successfully' })
  async initiateTrade(@Body() dto: InitiateTradeDto, @Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.tradeService.initiateTrade(userId, dto);
  }

  @Post(':id/payment-made')
  @ApiOperation({ summary: 'Mark payment as made' })
  @ApiResponse({ status: 200, description: 'Payment marked as made' })
  async markPaymentMade(
    @Param('id') id: string,
    @Body() dto: PaymentMadeDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.tradeService.markPaymentMade(id, userId, dto);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Release crypto to buyer' })
  @ApiResponse({ status: 200, description: 'Crypto released successfully' })
  async releaseCrypto(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.tradeService.releaseCrypto(id, userId, notes);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel trade' })
  @ApiResponse({ status: 200, description: 'Trade cancelled successfully' })
  async cancelTrade(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.tradeService.cancelTrade(id, userId, reason);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trade by ID' })
  @ApiResponse({ status: 200, description: 'Trade retrieved successfully' })
  async getTradeById(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.tradeService.getTradeById(id, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get user trades' })
  @ApiResponse({ status: 200, description: 'Trades retrieved successfully' })
  async getUserTrades(@Query('status') status: TradeStatus, @Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.tradeService.getUserTrades(userId, status);
  }

  @Get('active/list')
  @ApiOperation({ summary: 'Get active trades' })
  @ApiResponse({ status: 200, description: 'Active trades retrieved successfully' })
  async getActiveTrades(@Req() req: any) {
    const userId = req.user?.id || req.headers['x-user-id'];
    return this.tradeService.getActiveTrades(userId);
  }
}
