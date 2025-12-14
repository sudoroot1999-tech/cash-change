import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('transactions')
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly txService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user transaction history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTransactions(@Req() req: Request, @Query('page') page?: number, @Query('limit') limit?: number) {
    const userId = (req as any).user?.userId || 'test-user-id';
    const result = await this.txService.getUserTransactions(userId, page || 1, limit || 50);
    return { data: result.items, meta: { page: page || 1, limit: limit || 50, total: result.total } };
  }
}
