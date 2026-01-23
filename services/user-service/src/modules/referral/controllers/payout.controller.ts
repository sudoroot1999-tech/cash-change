import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PayoutService } from '../services';
import { RequestPayoutDto, PayoutQueryDto, ProcessPayoutDto } from '../dto';
import { AdminGuard, RequireAuth } from '@exchange/common';

@ApiTags('Payout')
@Controller('payout')
@RequireAuth()
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) { }

  @Post('request')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request payout' })
  @ApiResponse({ status: 201, description: 'Payout requested successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payout request' })
  async requestPayout(@Request() req, @Body() dto: RequestPayoutDto) {
    return await this.payoutService.requestPayout(req.user.userId, dto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user payouts' })
  @ApiResponse({ status: 200, description: 'Payouts retrieved successfully' })
  async getPayouts(@Request() req, @Query() query: PayoutQueryDto) {
    return await this.payoutService.getPayouts(req.user.userId, {
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payout statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getPayoutStats(@Request() req) {
    return await this.payoutService.getPayoutStats(req.user.userId);
  }

  @Get(':payoutId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payout details' })
  @ApiResponse({ status: 200, description: 'Payout details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  async getPayoutDetails(@Request() req, @Param('payoutId') payoutId: string) {
    return await this.payoutService.getPayoutDetails(payoutId, req.user.userId);
  }

  @Delete(':payoutId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel payout' })
  @ApiResponse({ status: 200, description: 'Payout cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Payout not found or cannot be cancelled' })
  async cancelPayout(@Request() req, @Param('payoutId') payoutId: string) {
    return await this.payoutService.cancelPayout(payoutId, req.user.userId);
  }

  // Admin endpoints
  @Get('admin/pending')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pending payouts (admin)' })
  @ApiResponse({ status: 200, description: 'Pending payouts retrieved successfully' })
  async getPendingPayouts() {
    return await this.payoutService.getAllPendingPayouts();
  }

  @Post('admin/process')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process payout (admin)' })
  @ApiResponse({ status: 200, description: 'Payout processed successfully' })
  async processPayout(@Request() req, @Body() dto: ProcessPayoutDto) {
    return await this.payoutService.processPayout(req.user.userId, dto);
  }

  @Get('admin/stats')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get system payout statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getSystemStats() {
    return await this.payoutService.getPayoutStats();
  }
}
