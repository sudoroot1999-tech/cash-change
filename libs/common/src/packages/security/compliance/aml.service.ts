import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface AMLCheck {
  id: string;
  userId: string;
  transactionId?: string;
  type: 'deposit' | 'withdrawal' | 'trade';
  amount: string;
  currency: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  status: 'pending' | 'approved' | 'rejected' | 'review';
  checkedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
}

export interface SuspiciousActivityReport {
  id: string;
  userId: string;
  type: string;
  description: string;
  amount?: string;
  currency?: string;
  relatedTransactions: string[];
  reportedAt: Date;
  reportedBy: string;
  status: 'pending' | 'investigating' | 'resolved' | 'filed';
}

@Injectable()
export class AMLService {
  private readonly logger = new Logger(AMLService.name);
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis(configService.get('REDIS_URL'));
  }

  /**
   * Perform AML check on transaction
   */
  async performAMLCheck(
    userId: string,
    type: 'deposit' | 'withdrawal' | 'trade',
    amount: string,
    currency: string,
    transactionId?: string,
  ): Promise<AMLCheck> {
    const id = `aml_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate risk score
    const riskScore = await this.calculateRiskScore(userId, type, amount, currency);
    const riskLevel = this.determineRiskLevel(riskScore);
    const flags = await this.detectFlags(userId, type, amount, currency);

    const check: AMLCheck = {
      id,
      userId,
      transactionId,
      type,
      amount,
      currency,
      riskScore,
      riskLevel,
      flags,
      status: riskLevel === 'critical' || riskLevel === 'high' ? 'review' : 'approved',
      checkedAt: new Date(),
    };

    // Store check
    await this.redis.set(`aml_check:${id}`, JSON.stringify(check), 'EX', 90 * 24 * 60 * 60);
    await this.redis.lpush(`user_aml_checks:${userId}`, id);
    await this.redis.ltrim(`user_aml_checks:${userId}`, 0, 99);

    if (check.status === 'review') {
      await this.redis.sadd('aml_pending_review', id);
      this.logger.warn(`AML check ${id} requires review: ${flags.join(', ')}`);
    }

    this.logger.log(`AML check ${id} completed: ${riskLevel} risk (score: ${riskScore})`);

    return check;
  }

  /**
   * Calculate risk score (0-100)
   */
  private async calculateRiskScore(
    userId: string,
    type: string,
    amount: string,
    currency: string,
  ): Promise<number> {
    let score = 0;

    // Check user history
    const userHistory = await this.getUserTransactionHistory(userId);

    // New user risk
    if (userHistory.length < 5) {
      score += 20;
    }

    // Large transaction risk
    const amountNum = parseFloat(amount);
    const avgAmount = userHistory.length > 0
      ? userHistory.reduce((sum, t) => sum + parseFloat(t.amount), 0) / userHistory.length
      : 0;

    if (avgAmount > 0 && amountNum > avgAmount * 5) {
      score += 30;
    }

    // Rapid transaction risk
    const recentTransactions = userHistory.filter(
      (t) => Date.now() - new Date(t.timestamp).getTime() < 24 * 60 * 60 * 1000,
    );
    if (recentTransactions.length > 10) {
      score += 20;
    }

    // Withdrawal to new address risk
    if (type === 'withdrawal') {
      score += 10;
    }

    // High-risk currency
    const highRiskCurrencies = ['XMR', 'ZEC', 'DASH'];
    if (highRiskCurrencies.includes(currency.toUpperCase())) {
      score += 15;
    }

    return Math.min(100, score);
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Detect suspicious flags
   */
  private async detectFlags(
    userId: string,
    type: string,
    amount: string,
    currency: string,
  ): Promise<string[]> {
    const flags: string[] = [];

    // Check for structuring (smurfing)
    const recentTransactions = await this.getRecentTransactions(userId, 24);
    const totalAmount = recentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    if (recentTransactions.length >= 3 && totalAmount > 10000) {
      flags.push('POSSIBLE_STRUCTURING');
    }

    // Check for round amounts (common in money laundering)
    const amountNum = parseFloat(amount);
    if (amountNum % 1000 === 0 && amountNum >= 10000) {
      flags.push('ROUND_AMOUNT');
    }

    // Check for rapid deposits and withdrawals
    const deposits = recentTransactions.filter((t) => t.type === 'deposit');
    const withdrawals = recentTransactions.filter((t) => t.type === 'withdrawal');

    if (deposits.length >= 3 && withdrawals.length >= 3) {
      flags.push('RAPID_MOVEMENT');
    }

    // Check for unusual patterns
    const userHistory = await this.getUserTransactionHistory(userId);
    if (userHistory.length > 0) {
      const avgAmount = userHistory.reduce((sum, t) => sum + parseFloat(t.amount), 0) / userHistory.length;

      if (amountNum > avgAmount * 10) {
        flags.push('UNUSUAL_AMOUNT');
      }
    }

    // Check for high-risk jurisdiction
    const userCountry = await this.redis.get(`user_country:${userId}`);
    const highRiskCountries = ['KP', 'IR', 'SY']; // Example high-risk countries

    if (userCountry && highRiskCountries.includes(userCountry)) {
      flags.push('HIGH_RISK_JURISDICTION');
    }

    return flags;
  }

  /**
   * Create suspicious activity report
   */
  async createSAR(
    userId: string,
    type: string,
    description: string,
    reportedBy: string,
    metadata?: {
      amount?: string;
      currency?: string;
      relatedTransactions?: string[];
    },
  ): Promise<SuspiciousActivityReport> {
    const id = `sar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const sar: SuspiciousActivityReport = {
      id,
      userId,
      type,
      description,
      amount: metadata?.amount,
      currency: metadata?.currency,
      relatedTransactions: metadata?.relatedTransactions || [],
      reportedAt: new Date(),
      reportedBy,
      status: 'pending',
    };

    await this.redis.set(`sar:${id}`, JSON.stringify(sar), 'EX', 365 * 24 * 60 * 60);
    await this.redis.sadd('pending_sars', id);
    await this.redis.lpush(`user_sars:${userId}`, id);

    this.logger.warn(`SAR ${id} created for user ${userId}: ${type}`);

    return sar;
  }

  /**
   * Get user transaction history
   */
  private async getUserTransactionHistory(userId: string): Promise<any[]> {
    const transactions: any[] = [];
    const txIds = await this.redis.lrange(`user_transactions:${userId}`, 0, 99);

    for (const txId of txIds) {
      const data = await this.redis.get(`transaction:${txId}`);
      if (data) {
        transactions.push(JSON.parse(data));
      }
    }

    return transactions;
  }

  /**
   * Get recent transactions
   */
  private async getRecentTransactions(userId: string, hours: number): Promise<any[]> {
    const allTransactions = await this.getUserTransactionHistory(userId);
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    return allTransactions.filter(
      (t) => new Date(t.timestamp).getTime() > cutoff,
    );
  }

  /**
   * Review AML check
   */
  async reviewAMLCheck(
    checkId: string,
    reviewerId: string,
    approved: boolean,
    notes?: string,
  ): Promise<void> {
    const data = await this.redis.get(`aml_check:${checkId}`);
    if (!data) {
      throw new Error('AML check not found');
    }

    const check: AMLCheck = JSON.parse(data);
    check.status = approved ? 'approved' : 'rejected';
    check.reviewedBy = reviewerId;
    check.reviewedAt = new Date();
    check.notes = notes;

    await this.redis.set(`aml_check:${checkId}`, JSON.stringify(check));
    await this.redis.srem('aml_pending_review', checkId);

    this.logger.log(`AML check ${checkId} reviewed by ${reviewerId}: ${check.status}`);
  }

  /**
   * Get pending reviews
   */
  async getPendingReviews(): Promise<AMLCheck[]> {
    const ids = await this.redis.smembers('aml_pending_review');
    const checks: AMLCheck[] = [];

    for (const id of ids) {
      const data = await this.redis.get(`aml_check:${id}`);
      if (data) {
        checks.push(JSON.parse(data));
      }
    }

    return checks;
  }

  /**
   * Get pending SARs
   */
  async getPendingSARs(): Promise<SuspiciousActivityReport[]> {
    const ids = await this.redis.smembers('pending_sars');
    const sars: SuspiciousActivityReport[] = [];

    for (const id of ids) {
      const data = await this.redis.get(`sar:${id}`);
      if (data) {
        sars.push(JSON.parse(data));
      }
    }

    return sars;
  }

  /**
   * Update SAR status
   */
  async updateSARStatus(
    sarId: string,
    status: 'pending' | 'investigating' | 'resolved' | 'filed',
  ): Promise<void> {
    const data = await this.redis.get(`sar:${sarId}`);
    if (!data) {
      throw new Error('SAR not found');
    }

    const sar: SuspiciousActivityReport = JSON.parse(data);
    sar.status = status;

    await this.redis.set(`sar:${sarId}`, JSON.stringify(sar));

    if (status !== 'pending') {
      await this.redis.srem('pending_sars', sarId);
    }

    this.logger.log(`SAR ${sarId} status updated to ${status}`);
  }
}
