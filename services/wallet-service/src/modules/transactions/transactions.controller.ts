import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RequireAuth, CurrentUser, AuthenticatedUser } from '@exchange/common';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('transactions')
@RequireAuth()
export class TransactionsController {
  constructor(private readonly txService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user transaction history' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.txService.getUserTransactions(user.userId, page || 1, limit || 50);
    return { data: result.items, meta: { page: page || 1, limit: limit || 50, total: result.total } };
  }
}
