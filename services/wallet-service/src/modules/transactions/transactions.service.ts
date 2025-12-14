import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class TransactionsService {
  // private readonly _logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly txRepository: Repository<Transaction>,
    private readonly walletsService: WalletsService,
  ) {}

  async getUserTransactions(userId: string, page = 1, limit = 50): Promise<{ items: Transaction[]; total: number }> {
    const [items, total] = await this.txRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  async createWithdrawal(userId: string, walletId: string, assetId: string, amount: string, toAddress: string, fee: string): Promise<Transaction> {
    // Lock balance first
    await this.walletsService.lockBalance(userId, assetId, (parseFloat(amount) + parseFloat(fee)).toFixed(18));

    const tx = this.txRepository.create({
      userId, walletId, type: TransactionType.WITHDRAWAL, amount, fee, toAddress, status: TransactionStatus.PENDING, requiredConfirmations: 1,
    });
    return this.txRepository.save(tx);
  }

  async confirmDeposit(userId: string, walletId: string, assetId: string, amount: string, txHash: string): Promise<Transaction> {
    // Credit balance
    await this.walletsService.credit(userId, assetId, amount);

    const tx = this.txRepository.create({
      userId, walletId, type: TransactionType.DEPOSIT, amount, txHash, status: TransactionStatus.COMPLETED, confirmations: 6, requiredConfirmations: 6,
    });
    return this.txRepository.save(tx);
  }
}
