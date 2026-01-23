import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { WithdrawalRiskLevel } from '../entities/withdrawal-request.entity';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import Decimal from 'decimal.js';

export interface RiskAssessment {
  riskLevel: WithdrawalRiskLevel;
  score: number;
  factors: string[];
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  /**
   * Assess withdrawal risk
   */
  async assessWithdrawalRisk(data: {
    userId: string;
    amount: string;
    currency: string;
    toAddress: string;
    isWhitelisted: boolean;
  }): Promise<RiskAssessment> {
    const { userId, amount, currency, toAddress, isWhitelisted } = data;
    const factors: string[] = [];
    let score = 0;

    // Factor 1: Amount (0-30 points)
    const amountNum = parseFloat(amount);
    if (amountNum > 100000) {
      score += 30;
      factors.push('Very large amount');
    } else if (amountNum > 50000) {
      score += 20;
      factors.push('Large amount');
    } else if (amountNum > 10000) {
      score += 10;
      factors.push('Moderate amount');
    }

    // Factor 2: Not whitelisted (0-20 points)
    if (!isWhitelisted) {
      score += 20;
      factors.push('Address not whitelisted');
    }

    // Factor 3: New address pattern (0-15 points)
    const recentWithdrawalsToAddress = await this.getRecentWithdrawalsToAddress(
      userId,
      toAddress,
      7, // last 7 days
    );

    if (recentWithdrawalsToAddress === 0) {
      score += 15;
      factors.push('First withdrawal to this address');
    }

    // Factor 4: Unusual frequency (0-20 points)
    const recentWithdrawals = await this.getRecentWithdrawalsCount(userId, 24); // last 24 hours
    
    if (recentWithdrawals > 10) {
      score += 20;
      factors.push('High withdrawal frequency');
    } else if (recentWithdrawals > 5) {
      score += 10;
      factors.push('Elevated withdrawal frequency');
    }

    // Factor 5: Velocity check (0-15 points)
    const velocityRisk = await this.checkVelocity(userId, currency, amount);
    score += velocityRisk.score;
    if (velocityRisk.factors.length > 0) {
      factors.push(...velocityRisk.factors);
    }

    // Determine risk level based on score
    let riskLevel: WithdrawalRiskLevel;
    
    if (score >= 70) {
      riskLevel = WithdrawalRiskLevel.CRITICAL;
    } else if (score >= 50) {
      riskLevel = WithdrawalRiskLevel.HIGH;
    } else if (score >= 30) {
      riskLevel = WithdrawalRiskLevel.MEDIUM;
    } else {
      riskLevel = WithdrawalRiskLevel.LOW;
    }

    this.logger.log(
      `Risk assessment for user ${userId}: ${riskLevel} (score: ${score})`,
    );

    return { riskLevel, score, factors };
  }

  /**
   * Check velocity (rapid increase in activity)
   */
  private async checkVelocity(
    userId: string,
    currency: string,
    amount: string,
  ): Promise<{ score: number; factors: string[] }> {
    const factors: string[] = [];
    let score = 0;

    // Compare recent withdrawal volume to historical average
    const last7Days = await this.getWithdrawalVolume(userId, currency, 7);
    const last30Days = await this.getWithdrawalVolume(userId, currency, 30);

    const dailyAverage30 = new Decimal(last30Days).dividedBy(30);
    const dailyAverage7 = new Decimal(last7Days).dividedBy(7);

    // If last 7 days average is much higher than 30 days average
    if (dailyAverage7.greaterThan(dailyAverage30.times(3))) {
      score += 15;
      factors.push('Abnormal increase in withdrawal activity');
    } else if (dailyAverage7.greaterThan(dailyAverage30.times(2))) {
      score += 10;
      factors.push('Elevated withdrawal activity');
    }

    return { score, factors };
  }

  /**
   * Get withdrawal volume for a period
   */
  private async getWithdrawalVolume(
    userId: string,
    currency: string,
    days: number,
  ): Promise<string> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await this.transactionRepository.find({
      where: {
        userId,
        currency,
        type: TransactionType.WITHDRAWAL,
        createdAt: MoreThan(startDate),
      },
    });

    const total = transactions.reduce((sum, tx) => {
      return sum.plus(tx.amount);
    }, new Decimal(0));

    return total.toString();
  }

  /**
   * Get recent withdrawals count
   */
  private async getRecentWithdrawalsCount(
    userId: string,
    hours: number,
  ): Promise<number> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const count = await this.transactionRepository.count({
      where: {
        userId,
        type: TransactionType.WITHDRAWAL,
        createdAt: MoreThan(startDate),
      },
    });

    return count;
  }

  /**
   * Get recent withdrawals to specific address
   */
  private async getRecentWithdrawalsToAddress(
    userId: string,
    address: string,
    days: number,
  ): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const count = await this.transactionRepository.count({
      where: {
        userId,
        type: TransactionType.WITHDRAWAL,
        toAddress: address,
        createdAt: MoreThan(startDate),
      },
    });

    return count;
  }

  /**
   * Detect anomalies in user behavior
   */
  async detectAnomalies(userId: string): Promise<{
    hasAnomalies: boolean;
    anomalies: string[];
  }> {
    const anomalies: string[] = [];

    // Check for unusual login patterns (would need user login data)
    // Check for IP address changes
    // Check for device changes
    // Check for sudden large transactions

    // Get user's transaction history
    const recentTxs = await this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    if (recentTxs.length < 10) {
      // Not enough data
      return { hasAnomalies: false, anomalies: [] };
    }

    // Calculate average transaction amount
    const avgAmount = recentTxs.reduce((sum, tx) => {
      return sum.plus(tx.amount);
    }, new Decimal(0)).dividedBy(recentTxs.length);

    // Check if latest transaction is significantly larger than average
    if (recentTxs.length > 0) {
      const latestAmount = new Decimal(recentTxs[0].amount);
      
      if (latestAmount.greaterThan(avgAmount.times(5))) {
        anomalies.push('Transaction amount significantly higher than average');
      }
    }

    // Check for rapid succession of transactions
    if (recentTxs.length >= 5) {
      const last5Txs = recentTxs.slice(0, 5);
      const timeSpan =
        last5Txs[0].createdAt.getTime() - last5Txs[4].createdAt.getTime();
      
      if (timeSpan < 60000) { // Less than 1 minute
        anomalies.push('Rapid succession of transactions');
      }
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
    };
  }

  /**
   * Check if transaction looks like dusting attack
   */
  async checkDustingAttack(
    address: string,
    amount: string,
  ): Promise<boolean> {
    const amountNum = parseFloat(amount);
    
    // Very small amounts might be dusting attempts
    if (amountNum < 0.0001) {
      this.logger.warn(`Possible dusting attack detected: ${amount} to ${address}`);
      return true;
    }

    return false;
  }

  /**
   * Validate transaction pattern
   */
  async validateTransactionPattern(
    userId: string,
    type: TransactionType,
    amount: string,
  ): Promise<{ isValid: boolean; reason?: string }> {
    // Get user's recent transactions
    const recentTxs = await this.transactionRepository.find({
      where: { userId, type },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    if (recentTxs.length === 0) {
      // First transaction, allow
      return { isValid: true };
    }

    // Check for exactly same amounts in quick succession (possible automation)
    const sameAmountCount = recentTxs.filter(
      (tx) => tx.amount === amount,
    ).length;

    if (sameAmountCount > 3) {
      return {
        isValid: false,
        reason: 'Suspicious pattern: Multiple identical transactions',
      };
    }

    return { isValid: true };
  }

  /**
   * Rate limit check
   */
  async checkRateLimit(
    userId: string,
    action: string,
    limit: number,
    windowMinutes: number,
  ): Promise<boolean> {
    // In production, use Redis for rate limiting
    // This is a simplified version using database

    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() - windowMinutes);

    const count = await this.transactionRepository.count({
      where: {
        userId,
        createdAt: MoreThan(startDate),
      },
    });

    return count < limit;
  }

  /**
   * Generate security audit log
   */
  async logSecurityEvent(event: {
    userId: string;
    action: string;
    riskLevel: string;
    details: Record<string, any>;
  }): Promise<void> {
    // In production, send to security logging system
    this.logger.log(
      `Security Event: ${event.action} by ${event.userId} (Risk: ${event.riskLevel})`,
      event.details,
    );
  }
}
