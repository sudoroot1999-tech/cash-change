import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { WalletService } from './wallets.service';
import { AddressService } from './services/address.service';
import { TransactionService } from './services/transaction.service';
import { WithdrawalService } from './services/withdrawal.service';
import { InternalTransferService } from './services/internal-transfer.service';
import { DepositMonitorService } from './services/deposit-monitor.service';
import { WalletGateway } from './websocket/wallet.gateway';
import {
  CreateWalletDto,
  GetBalanceDto,
  GenerateAddressDto,
  WithdrawDto,
  InternalTransferDto,
  ApproveWithdrawalDto,
  RejectWithdrawalDto,
  AddToWhitelistDto,
  GetTransactionsDto,
} from './dto/wallet.dto';
import { RequireAuth } from '@exchange/common';

@ApiTags('wallet')
@ApiBearerAuth()
@RequireAuth()
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletManagerService: WalletService,
    private readonly addressService: AddressService,
    private readonly transactionService: TransactionService,
    private readonly withdrawalService: WithdrawalService,
    private readonly internalTransferService: InternalTransferService,
    private readonly depositMonitorService: DepositMonitorService,
    private readonly walletGateway: WalletGateway,
  ) { }

  // ============ Wallet Management ============

  @Get('balances')
  @ApiOperation({ summary: 'Get user wallet balances' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Wallet balances retrieved' })
  async getBalances(@Query('userId') userId: string) {
    const wallets = await this.walletManagerService.getUserWallets(userId);

    const balances = await Promise.all(
      wallets.map(async (wallet) => {
        const balance = await this.walletManagerService.getBalance(wallet.id);
        return {
          currency: wallet.currency,
          ...balance,
          addresses: await this.addressService.getWalletAddresses(wallet.id),
        };
      }),
    );

    return {
      success: true,
      data: balances,
    };
  }

  @Post('create')
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiResponse({ status: 201, description: 'Wallet created' })
  async createWallet(@Body() dto: CreateWalletDto) {
    const wallet = await this.walletManagerService.createWallet(
      dto.userId,
      dto.currency,
      dto.type,
    );

    return {
      success: true,
      data: wallet,
    };
  }

  // ============ Address Management ============

  @Get('address/:currency')
  @ApiOperation({ summary: 'Get or generate deposit address for currency' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Deposit address retrieved/generated' })
  async getAddress(
    @Param('currency') currency: string,
    @Query('userId') userId: string,
  ) {
    const wallet = await this.walletManagerService.getUserWalletByCurrency(
      userId,
      currency,
    );

    let addresses = await this.addressService.getWalletAddresses(wallet.id);

    // Get unused address or generate new one
    let address = addresses.find((a) => !a.isUsed);

    if (!address) {
      address = await this.addressService.generateDepositAddress(wallet.id);
    }

    return {
      success: true,
      data: address,
    };
  }

  @Post('address/generate')
  @ApiOperation({ summary: 'Generate new deposit address' })
  @ApiResponse({ status: 201, description: 'Address generated' })
  async generateAddress(@Body() dto: GenerateAddressDto) {
    const wallet = await this.walletManagerService.getUserWalletByCurrency(
      dto.userId,
      dto.currency,
    );

    const address = await this.addressService.generateDepositAddress(
      wallet.id,
      dto.label,
    );

    return {
      success: true,
      data: address,
    };
  }

  // ============ Withdrawals ============

  @Post('withdraw')
  @ApiOperation({ summary: 'Request a withdrawal' })
  @ApiResponse({ status: 201, description: 'Withdrawal request created' })
  async withdraw(@Body() dto: WithdrawDto) {
    const withdrawal = await this.withdrawalService.requestWithdrawal({
      userId: dto.userId,
      currency: dto.currency,
      amount: dto.amount,
      toAddress: dto.toAddress,
      twoFactorCode: dto.twoFactorCode,
      idempotencyKey: dto.idempotencyKey,
    });

    // Send WebSocket notification
    this.walletGateway.sendWithdrawalUpdate(dto.userId, {
      withdrawalId: withdrawal.id,
      status: withdrawal.status,
    });

    return {
      success: true,
      data: withdrawal,
      message: 'Withdrawal request submitted successfully',
    };
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Get user withdrawal requests' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Withdrawal requests retrieved' })
  async getWithdrawals(@Query('userId') userId: string) {
    const withdrawals = await this.withdrawalService.getUserWithdrawals(userId);

    return {
      success: true,
      data: withdrawals,
    };
  }

  @Post('withdraw/approve')
  @ApiOperation({ summary: 'Approve a withdrawal request' })
  @ApiResponse({ status: 200, description: 'Withdrawal approved' })
  async approveWithdrawal(@Body() dto: ApproveWithdrawalDto) {
    const withdrawal = await this.withdrawalService.approveWithdrawal(
      dto.withdrawalRequestId,
      dto.approverId,
      dto.comment,
    );

    return {
      success: true,
      data: withdrawal,
      message: 'Withdrawal approved',
    };
  }

  @Post('withdraw/reject')
  @ApiOperation({ summary: 'Reject a withdrawal request' })
  @ApiResponse({ status: 200, description: 'Withdrawal rejected' })
  async rejectWithdrawal(@Body() dto: RejectWithdrawalDto) {
    const withdrawal = await this.withdrawalService.rejectWithdrawal(
      dto.withdrawalRequestId,
      dto.rejectedBy,
      dto.reason,
    );

    return {
      success: true,
      data: withdrawal,
      message: 'Withdrawal rejected',
    };
  }

  @Get('withdrawal-limits')
  @ApiOperation({ summary: 'Get withdrawal limits for user' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'currency', required: true })
  @ApiResponse({ status: 200, description: 'Withdrawal limits retrieved' })
  async getWithdrawalLimits(
    @Query('userId') userId: string,
    @Query('currency') currency: string,
  ) {
    const limits = await this.withdrawalService.getUserLimits(userId, currency);

    return {
      success: true,
      data: limits,
    };
  }

  @Post('whitelist/add')
  @ApiOperation({ summary: 'Add address to withdrawal whitelist' })
  @ApiResponse({ status: 201, description: 'Address added to whitelist' })
  async addToWhitelist(@Body() dto: AddToWhitelistDto) {
    const whitelist = await this.withdrawalService.addToWhitelist(
      dto.userId,
      dto.address,
      dto.currency,
      dto.label,
    );

    return {
      success: true,
      data: whitelist,
      message: 'Address added to whitelist',
    };
  }

  // ============ Transactions ============

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved' })
  async getTransactions(@Query() dto: GetTransactionsDto) {
    const { transactions, total } =
      await this.transactionService.getUserTransactions(dto.userId, {
        currency: dto.currency,
        type: dto.type as any,
        page: dto.page || 1,
        limit: dto.limit || 20,
      });

    return {
      success: true,
      data: transactions,
      pagination: {
        page: dto.page || 1,
        limit: dto.limit || 20,
        total,
      },
    };
  }

  @Get('transaction/:id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved' })
  async getTransaction(@Param('id') id: string) {
    const transaction = await this.transactionService.getTransaction(id);

    return {
      success: true,
      data: transaction,
    };
  }

  // ============ Deposits ============

  @Get('deposit-history')
  @ApiOperation({ summary: 'Get deposit history' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'currency', required: false })
  @ApiResponse({ status: 200, description: 'Deposit history retrieved' })
  async getDepositHistory(
    @Query('userId') userId: string,
    @Query('currency') currency?: string,
  ) {
    const deposits = await this.depositMonitorService.getUserDepositHistory(
      userId,
      currency,
    );

    return {
      success: true,
      data: deposits,
    };
  }

  // ============ Internal Transfers ============

  @Post('internal-transfer')
  @ApiOperation({ summary: 'Execute internal transfer between users' })
  @ApiResponse({ status: 201, description: 'Transfer executed' })
  @HttpCode(HttpStatus.OK)
  async internalTransfer(@Body() dto: InternalTransferDto) {
    const transfer = await this.internalTransferService.executeTransfer({
      fromUserId: dto.fromUserId,
      toUserId: dto.toUserId,
      currency: dto.currency,
      amount: dto.amount,
      description: dto.description,
      idempotencyKey: dto.idempotencyKey,
    });

    // Send WebSocket notifications to both users
    this.walletGateway.sendInternalTransferNotification(dto.fromUserId, {
      type: 'sent',
      amount: dto.amount,
      currency: dto.currency,
      toUserId: dto.toUserId,
    });

    this.walletGateway.sendInternalTransferNotification(dto.toUserId, {
      type: 'received',
      amount: dto.amount,
      currency: dto.currency,
      fromUserId: dto.fromUserId,
    });

    // Send balance updates
    const [fromWallet, toWallet] = await Promise.all([
      this.walletManagerService.getUserWalletByCurrency(
        dto.fromUserId,
        dto.currency,
      ),
      this.walletManagerService.getUserWalletByCurrency(
        dto.toUserId,
        dto.currency,
      ),
    ]);

    const [fromBalance, toBalance] = await Promise.all([
      this.walletManagerService.getBalance(fromWallet.id),
      this.walletManagerService.getBalance(toWallet.id),
    ]);

    this.walletGateway.sendBalanceUpdate(dto.fromUserId, {
      currency: dto.currency,
      ...fromBalance,
    });

    this.walletGateway.sendBalanceUpdate(dto.toUserId, {
      currency: dto.currency,
      ...toBalance,
    });

    return {
      success: true,
      data: transfer,
      message: 'Transfer completed successfully',
    };
  }

  @Get('transfers')
  @ApiOperation({ summary: 'Get internal transfer history' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Transfer history retrieved' })
  async getTransfers(@Query('userId') userId: string) {
    const transfers = await this.internalTransferService.getUserTransfers(userId);

    return {
      success: true,
      data: transfers,
    };
  }

  // ============ Health Check ============

  // @Get('health')
  // @ApiOperation({ summary: 'Health check endpoint' })
  // @ApiResponse({ status: 200, description: 'Service is healthy' })
  // async healthCheck() {
  //   return {
  //     success: true,
  //     message: 'Wallet service is running',
  //     timestamp: new Date(),
  //   };
  // }
}
