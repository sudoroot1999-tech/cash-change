import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../auth/entities/admin.entity';

@ApiTags('Admin - Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_ADMIN, AdminRole.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'List all transactions' })
  async findAll(@Query() query: any) {
    return this.transactionsService.findAll(query);
  }

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Get transaction statistics' })
  async getStats() {
    return this.transactionsService.getTransactionStats();
  }

  @Get(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_ADMIN, AdminRole.SUPPORT_ADMIN)
  @ApiOperation({ summary: 'Get transaction by ID' })
  async findById(@Param('id') id: string) {
    return this.transactionsService.findById(id);
  }

  @Post(':id/approve')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Approve withdrawal transaction' })
  async approveWithdrawal(@Param('id') id: string, @Body() body: { notes?: string }) {
    return this.transactionsService.approveWithdrawal(id, body.notes);
  }

  @Post(':id/reject')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_ADMIN)
  @ApiOperation({ summary: 'Reject withdrawal transaction' })
  async rejectWithdrawal(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.transactionsService.rejectWithdrawal(id, body.reason);
  }
}

