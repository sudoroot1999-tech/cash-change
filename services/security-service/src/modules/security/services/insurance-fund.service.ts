import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InsuranceFundTransaction,
  InsuranceFundBalance
} from '../entities/insurance-fund.entity';
import Decimal from 'decimal.js';
import { INSURANCE_FUND_TRANSACTION_TYPES } from 'libs/common/dist';

@Injectable()
export class InsuranceFundService {
  private readonly logger = new Logger(InsuranceFundService.name);
  private readonly SAFU_PERCENTAGE = 0.1; // 10% of fees

  constructor(
    @InjectRepository(InsuranceFundTransaction)
    private transactionRepository: Repository<InsuranceFundTransaction>,
    @InjectRepository(InsuranceFundBalance)
    private balanceRepository: Repository<InsuranceFundBalance>,
  ) {}

  /**
   * Get or create balance for currency
   */
  private async getBalance(currency: string): Promise<InsuranceFundBalance> {
    let balance = await this.balanceRepository.findOne({
      where: { currency },
    });

    if (!balance) {
      balance = this.balanceRepository.create({
        currency,
        balance: '0',
      });
      await this.balanceRepository.save(balance);
    }

    return balance;
  }

  /**
   * Deposit to insurance fund (SAFU)
   */
  async deposit(
    currency: string,
    amount: string,
    description?: string,
  ): Promise<InsuranceFundTransaction> {
    const balance = await this.getBalance(currency);
    const currentBalance = new Decimal(balance.balance);
    const depositAmount = new Decimal(amount);
    const newBalance = currentBalance.plus(depositAmount);

    // Update balance
    balance.balance = newBalance.toString();
    await this.balanceRepository.save(balance);

    // Record transaction
    const transaction = this.transactionRepository.create({
      currency,
      type: INSURANCE_FUND_TRANSACTION_TYPES.DEPOSIT,
      amount,
      balanceAfter: newBalance.toString(),
      description: description || 'SAFU fund deposit',
    });

    await this.transactionRepository.save(transaction);
    this.logger.log(`Insurance fund deposit: ${amount} ${currency}`);
    
    return transaction;
  }

  /**
   * Process fee contribution to SAFU fund
   */
  async processFeeContribution(
    currency: string,
    feeAmount: string,
  ): Promise<void> {
    const fee = new Decimal(feeAmount);
    const safuAmount = fee.times(this.SAFU_PERCENTAGE);

    await this.deposit(
      currency,
      safuAmount.toString(),
      `SAFU contribution from trading fees`,
    );
  }

  /**
   * Withdraw from insurance fund
   */
  async withdraw(
    currency: string,
    amount: string,
    description: string,
  ): Promise<InsuranceFundTransaction> {
    const balance = await this.getBalance(currency);
    const currentBalance = new Decimal(balance.balance);
    const withdrawAmount = new Decimal(amount);

    if (withdrawAmount.greaterThan(currentBalance)) {
      throw new BadRequestException('Insufficient insurance fund balance');
    }

    const newBalance = currentBalance.minus(withdrawAmount);

    // Update balance
    balance.balance = newBalance.toString();
    await this.balanceRepository.save(balance);

    // Record transaction
    const transaction = this.transactionRepository.create({
      currency,
      type: INSURANCE_FUND_TRANSACTION_TYPES.WITHDRAWAL,
      amount,
      balanceAfter: newBalance.toString(),
      description,
    });

    await this.transactionRepository.save(transaction);
    this.logger.log(`Insurance fund withdrawal: ${amount} ${currency}`);
    
    return transaction;
  }

  /**
   * Process insurance claim
   */
  async processClaim(
    currency: string,
    amount: string,
    incidentId: string,
    description: string,
  ): Promise<InsuranceFundTransaction> {
    const balance = await this.getBalance(currency);
    const currentBalance = new Decimal(balance.balance);
    const claimAmount = new Decimal(amount);

    if (claimAmount.greaterThan(currentBalance)) {
      this.logger.error(
        `Insurance fund claim exceeds balance: ${amount} ${currency}`,
      );
      throw new BadRequestException('Insufficient insurance fund balance for claim');
    }

    const newBalance = currentBalance.minus(claimAmount);

    // Update balance
    balance.balance = newBalance.toString();
    await this.balanceRepository.save(balance);

    // Record transaction
    const transaction = this.transactionRepository.create({
      currency,
      type: INSURANCE_FUND_TRANSACTION_TYPES.CLAIM,
      amount,
      balanceAfter: newBalance.toString(),
      description,
      relatedIncidentId: incidentId,
    });

    await this.transactionRepository.save(transaction);
    this.logger.log(`Insurance claim processed: ${amount} ${currency} for incident ${incidentId}`);
    
    return transaction;
  }

  /**
   * Get current balance
   */
  async getCurrentBalance(currency: string): Promise<InsuranceFundBalance> {
    return await this.getBalance(currency);
  }

  /**
   * Get all balances
   */
  async getAllBalances(): Promise<InsuranceFundBalance[]> {
    return await this.balanceRepository.find();
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    currency: string,
    limit: number = 100,
  ): Promise<InsuranceFundTransaction[]> {
    return await this.transactionRepository.find({
      where: { currency },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get total deposits
   */
  async getTotalDeposits(currency: string): Promise<string> {
    const transactions = await this.transactionRepository.find({
      where: {
        currency,
        type: INSURANCE_FUND_TRANSACTION_TYPES.DEPOSIT,
      },
    });

    const total = transactions.reduce(
      (sum, tx) => sum.plus(new Decimal(tx.amount)),
      new Decimal(0),
    );

    return total.toString();
  }

  /**
   * Get total claims
   */
  async getTotalClaims(currency: string): Promise<string> {
    const transactions = await this.transactionRepository.find({
      where: {
        currency,
        type: INSURANCE_FUND_TRANSACTION_TYPES.CLAIM,
      },
    });

    const total = transactions.reduce(
      (sum, tx) => sum.plus(new Decimal(tx.amount)),
      new Decimal(0),
    );

    return total.toString();
  }

  /**
   * Generate fund report
   */
  async generateReport(currency: string): Promise<any> {
    const balance = await this.getCurrentBalance(currency);
    const totalDeposits = await this.getTotalDeposits(currency);
    const totalClaims = await this.getTotalClaims(currency);
    const recentTransactions = await this.getTransactionHistory(currency, 10);

    return {
      currency,
      currentBalance: balance.balance,
      totalDeposits,
      totalClaims,
      lastAudit: balance.lastAuditAt,
      recentTransactions: recentTransactions.map(tx => ({
        type: tx.type,
        amount: tx.amount,
        date: tx.createdAt,
        description: tx.description,
      })),
    };
  }

  /**
   * Record audit
   */
  async recordAudit(currency: string): Promise<void> {
    const balance = await this.getBalance(currency);
    balance.lastAuditAt = new Date();
    await this.balanceRepository.save(balance);
    this.logger.log(`Insurance fund audit recorded for ${currency}`);
  }

  /**
   * Check if fund can cover amount
   */
  async canCoverAmount(currency: string, amount: string): Promise<boolean> {
    const balance = await this.getBalance(currency);
    const currentBalance = new Decimal(balance.balance);
    const requiredAmount = new Decimal(amount);

    return currentBalance.greaterThanOrEqualTo(requiredAmount);
  }
}
