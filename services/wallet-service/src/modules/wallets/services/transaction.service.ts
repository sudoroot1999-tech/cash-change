import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../entities/transaction.entity';
import { Wallet } from '../entities/wallet.entity';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
  ) {}

  /**
   * Create a new transaction record
   */
  async createTransaction(data: {
    userId: string;
    walletId: string;
    type: TransactionType;
    amount: string;
    fee: string;
    currency: string;
    status: TransactionStatus;
    fromAddress?: string;
    toAddress?: string;
    txHash?: string;
    description?: string;
    idempotencyKey?: string;
    metadata?: Record<string, any>;
  }): Promise<Transaction> {
    // Check for duplicate idempotency key
    if (data.idempotencyKey) {
      const existing = await this.transactionRepository.findOne({
        where: { idempotencyKey: data.idempotencyKey },
      });

      if (existing) {
        this.logger.warn(`Duplicate transaction attempt: ${data.idempotencyKey}`);
        return existing;
      }
    }

    const transaction = this.transactionRepository.create(data);
    const saved = await this.transactionRepository.save(transaction);

    this.logger.log(`Transaction created: ${saved.id} (${saved.type})`);

    return saved;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ['wallet'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  /**
   * Get transaction by tx hash
   */
  async getTransactionByHash(txHash: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({
      where: { txHash },
      relations: ['wallet'],
    });
  }

  /**
   * Get user transactions with pagination
   */
  async getUserTransactions(
    userId: string,
    options: {
      currency?: string;
      type?: TransactionType;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const { currency, type, page = 1, limit = 20 } = options;

    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId });

    if (currency) {
      query.andWhere('transaction.currency = :currency', { currency });
    }

    if (type) {
      query.andWhere('transaction.type = :type', { type });
    }

    query
      .orderBy('transaction.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [transactions, total] = await query.getManyAndCount();

    return { transactions, total };
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(
    walletId: string,
    limit: number = 100,
  ): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    metadata?: Record<string, any>,
  ): Promise<Transaction> {
    const transaction = await this.getTransaction(transactionId);

    transaction.status = status;
    
    if (metadata) {
      transaction.metadata = { ...transaction.metadata, ...metadata };
    }

    if (status === TransactionStatus.COMPLETED) {
      transaction.completedAt = new Date();
    }

    const updated = await this.transactionRepository.save(transaction);

    this.logger.log(`Transaction ${transactionId} status updated to ${status}`);

    return updated;
  }

  /**
   * Update transaction confirmations
   */
  async updateConfirmations(
    transactionId: string,
    confirmations: number,
  ): Promise<void> {
    const transaction = await this.getTransaction(transactionId);

    transaction.confirmations = confirmations;

    // Auto-update status based on confirmations
    if (
      confirmations >= transaction.requiredConfirmations &&
      transaction.status === TransactionStatus.CONFIRMING
    ) {
      transaction.status = TransactionStatus.CONFIRMED;
    }

    await this.transactionRepository.save(transaction);

    this.logger.log(
      `Transaction ${transactionId} confirmations updated: ${confirmations}`,
    );
  }

  /**
   * Get pending transactions
   */
  async getPendingTransactions(currency?: string): Promise<Transaction[]> {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.status IN (:...statuses)', {
        statuses: [TransactionStatus.PENDING, TransactionStatus.CONFIRMING],
      });

    if (currency) {
      query.andWhere('transaction.currency = :currency', { currency });
    }

    return query.getMany();
  }

  /**
   * Get transactions requiring confirmation updates
   */
  async getTransactionsNeedingConfirmation(): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: {
        status: TransactionStatus.CONFIRMING,
      },
      order: { createdAt: 'DESC' },
      take: 1000,
    });
  }

  /**
   * Calculate transaction statistics for a user
   */
  async getUserTransactionStats(
    userId: string,
    currency: string,
    days: number = 30,
  ): Promise<{
    totalDeposits: string;
    totalWithdrawals: string;
    transactionCount: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await this.transactionRepository.find({
      where: {
        userId,
        currency,
        createdAt: MoreThan(startDate),
        status: TransactionStatus.COMPLETED,
      },
    });

    let totalDeposits = 0;
    let totalWithdrawals = 0;

    for (const tx of transactions) {
      const amount = parseFloat(tx.amount);
      
      if (tx.type === TransactionType.DEPOSIT) {
        totalDeposits += amount;
      } else if (tx.type === TransactionType.WITHDRAWAL) {
        totalWithdrawals += amount;
      }
    }

    return {
      totalDeposits: totalDeposits.toString(),
      totalWithdrawals: totalWithdrawals.toString(),
      transactionCount: transactions.length,
    };
  }

  /**
   * Fail transaction
   */
  async failTransaction(
    transactionId: string,
    reason: string,
  ): Promise<Transaction> {
    const transaction = await this.getTransaction(transactionId);

    transaction.status = TransactionStatus.FAILED;
    transaction.metadata = {
      ...transaction.metadata,
      failureReason: reason,
      failedAt: new Date(),
    };

    const updated = await this.transactionRepository.save(transaction);

    this.logger.error({ message: `Transaction ${transactionId} failed: ${reason}` });

    return updated;
  }
}
