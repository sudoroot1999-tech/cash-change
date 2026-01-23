import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  InternalTransfer,
  InternalTransferStatus,
} from '../entities/internal-transfer.entity';
import { WalletService } from '../wallets.service';
import { TransactionService } from './transaction.service';
import { TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

@Injectable()
export class InternalTransferService {
  private readonly logger = new Logger(InternalTransferService.name);

  constructor(
    @InjectRepository(InternalTransfer)
    private transferRepository: Repository<InternalTransfer>,
    private walletManagerService: WalletService,
    private transactionService: TransactionService,
    private dataSource: DataSource,
  ) {}

  /**
   * Execute internal transfer between users
   */
  async executeTransfer(data: {
    fromUserId: string;
    toUserId: string;
    currency: string;
    amount: string;
    description?: string;
    idempotencyKey?: string;
  }): Promise<InternalTransfer> {
    const {
      fromUserId,
      toUserId,
      currency,
      amount,
      description,
      idempotencyKey,
    } = data;

    // Generate idempotency key if not provided
    const idempKey = idempotencyKey || uuidv4();

    // Check for duplicate
    const existing = await this.transferRepository.findOne({
      where: { idempotencyKey: idempKey },
    });

    if (existing) {
      this.logger.warn(`Duplicate transfer attempt: ${idempKey}`);
      return existing;
    }

    // Validate amount
    const transferAmount = new Decimal(amount);
    if (transferAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Transfer amount must be positive');
    }

    // Validate users are different
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    // Get wallets
    const fromWallet = await this.walletManagerService.getUserWalletByCurrency(
      fromUserId,
      currency,
    );

    let toWallet;
    try {
      toWallet = await this.walletManagerService.getUserWalletByCurrency(
        toUserId,
        currency,
      );
    } catch (error) {
      // Create wallet if it doesn't exist
      toWallet = await this.walletManagerService.createWallet(toUserId, currency);
    }

    // Check balance
    const balance = await this.walletManagerService.getBalance(fromWallet.id);
    if (new Decimal(balance.availableBalance).lessThan(transferAmount)) {
      throw new BadRequestException('Insufficient balance');
    }

    return this.dataSource.transaction(async (manager) => {
      // Create transfer record
      const transfer = manager.create(InternalTransfer, {
        fromUserId,
        toUserId,
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amount,
        currency: currency.toUpperCase(),
        status: InternalTransferStatus.PROCESSING,
        description,
        idempotencyKey: idempKey,
      });

      const savedTransfer = await manager.save(transfer);

      try {
        // Execute the transfer
        await this.walletManagerService.transferBetweenWallets(
          fromWallet.id,
          toWallet.id,
          amount,
        );

        // Create transaction records for both users
        await Promise.all([
          this.transactionService.createTransaction({
            userId: fromUserId,
            walletId: fromWallet.id,
            type: TransactionType.INTERNAL_TRANSFER,
            amount: `-${amount}`,
            fee: '0',
            currency: currency.toUpperCase(),
            status: TransactionStatus.COMPLETED,
            toAddress: toUserId,
            description: `Transfer to ${toUserId}: ${description || ''}`,
            idempotencyKey: `${idempKey}-from`,
          }),
          this.transactionService.createTransaction({
            userId: toUserId,
            walletId: toWallet.id,
            type: TransactionType.INTERNAL_TRANSFER,
            amount,
            fee: '0',
            currency: currency.toUpperCase(),
            status: TransactionStatus.COMPLETED,
            fromAddress: fromUserId,
            description: `Transfer from ${fromUserId}: ${description || ''}`,
            idempotencyKey: `${idempKey}-to`,
          }),
        ]);

        // Update transfer status
        savedTransfer.status = InternalTransferStatus.COMPLETED;
        savedTransfer.completedAt = new Date();
        await manager.save(savedTransfer);

        this.logger.log(
          `Internal transfer completed: ${amount} ${currency} from ${fromUserId} to ${toUserId}`,
        );

        return savedTransfer;
      } catch (error) {
        this.logger.error('Internal transfer failed:', error);

        // Update transfer status to failed
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        savedTransfer.status = InternalTransferStatus.FAILED;
        savedTransfer.metadata = {
          error: errorMessage,
          failedAt: new Date(),
        };
        await manager.save(savedTransfer);

        throw new BadRequestException(`Transfer failed: ${errorMessage}`);
      }
    });
  }

  /**
   * Get transfer by ID
   */
  async getTransfer(transferId: string): Promise<InternalTransfer> {
    const transfer = await this.transferRepository.findOne({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return transfer;
  }

  /**
   * Get user's sent transfers
   */
  async getUserSentTransfers(
    userId: string,
    limit: number = 50,
  ): Promise<InternalTransfer[]> {
    return this.transferRepository.find({
      where: { fromUserId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get user's received transfers
   */
  async getUserReceivedTransfers(
    userId: string,
    limit: number = 50,
  ): Promise<InternalTransfer[]> {
    return this.transferRepository.find({
      where: { toUserId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get all transfers for a user (sent and received)
   */
  async getUserTransfers(
    userId: string,
    limit: number = 50,
  ): Promise<InternalTransfer[]> {
    const [sent, received] = await Promise.all([
      this.getUserSentTransfers(userId, limit / 2),
      this.getUserReceivedTransfers(userId, limit / 2),
    ]);

    // Combine and sort by date
    const all = [...sent, ...received].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    return all.slice(0, limit);
  }

  /**
   * Reverse a transfer (admin only, for disputes)
   */
  async reverseTransfer(
    transferId: string,
    reason: string,
  ): Promise<InternalTransfer> {
    return this.dataSource.transaction(async (manager) => {
      const transfer = await manager.findOne(InternalTransfer, {
        where: { id: transferId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!transfer) {
        throw new NotFoundException('Transfer not found');
      }

      if (transfer.status !== InternalTransferStatus.COMPLETED) {
        throw new BadRequestException('Can only reverse completed transfers');
      }

      // Execute reverse transfer
      await this.walletManagerService.transferBetweenWallets(
        transfer.toWalletId,
        transfer.fromWalletId,
        transfer.amount,
      );

      // Create reversal transaction records
      await Promise.all([
        this.transactionService.createTransaction({
          userId: transfer.fromUserId,
          walletId: transfer.fromWalletId,
          type: TransactionType.INTERNAL_TRANSFER,
          amount: transfer.amount,
          fee: '0',
          currency: transfer.currency,
          status: TransactionStatus.COMPLETED,
          fromAddress: transfer.toUserId,
          description: `Transfer reversal: ${reason}`,
          idempotencyKey: `${transfer.idempotencyKey}-reverse-from`,
        }),
        this.transactionService.createTransaction({
          userId: transfer.toUserId,
          walletId: transfer.toWalletId,
          type: TransactionType.INTERNAL_TRANSFER,
          amount: `-${transfer.amount}`,
          fee: '0',
          currency: transfer.currency,
          status: TransactionStatus.COMPLETED,
          toAddress: transfer.fromUserId,
          description: `Transfer reversal: ${reason}`,
          idempotencyKey: `${transfer.idempotencyKey}-reverse-to`,
        }),
      ]);

      // Update transfer status
      transfer.status = InternalTransferStatus.REVERSED;
      transfer.metadata = {
        ...transfer.metadata,
        reversalReason: reason,
        reversedAt: new Date(),
      };
      await manager.save(transfer);

      this.logger.log(`Transfer ${transferId} reversed: ${reason}`);

      return transfer;
    });
  }

  /**
   * Get transfer statistics for a user
   */
  async getUserTransferStats(
    userId: string,
    days: number = 30,
  ): Promise<{
    totalSent: string;
    totalReceived: string;
    transferCount: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [sent, received] = await Promise.all([
      this.transferRepository
        .createQueryBuilder('transfer')
        .where('transfer.fromUserId = :userId', { userId })
        .andWhere('transfer.status = :status', {
          status: InternalTransferStatus.COMPLETED,
        })
        .andWhere('transfer.createdAt > :startDate', { startDate })
        .getMany(),
      this.transferRepository
        .createQueryBuilder('transfer')
        .where('transfer.toUserId = :userId', { userId })
        .andWhere('transfer.status = :status', {
          status: InternalTransferStatus.COMPLETED,
        })
        .andWhere('transfer.createdAt > :startDate', { startDate })
        .getMany(),
    ]);

    const totalSent = sent.reduce((sum, t) => sum.plus(t.amount), new Decimal(0));
    const totalReceived = received.reduce(
      (sum, t) => sum.plus(t.amount),
      new Decimal(0),
    );

    return {
      totalSent: totalSent.toString(),
      totalReceived: totalReceived.toString(),
      transferCount: sent.length + received.length,
    };
  }
}
