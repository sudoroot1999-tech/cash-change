import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { RiskScore } from '../entities/risk-score.entity';
import { SecurityEvent, SecurityEventType, RiskLevel } from '../entities/security-event.entity';
import Decimal from 'decimal.js';

export interface TransactionData {
  userId: string;
  type: string;
  amount: string;
  currency: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  timestamp: Date;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  riskScore: number;
  factors: string[];
}

@Injectable()
export class TransactionMonitoringService {
  private readonly logger = new Logger(TransactionMonitoringService.name);

  constructor(
    @InjectRepository(RiskScore)
    private riskScoreRepository: Repository<RiskScore>,
    @InjectRepository(SecurityEvent)
    private securityEventRepository: Repository<SecurityEvent>,
  ) {}

  /**
   * Analyze transaction for anomalies
   */
  async analyzeTransaction(
    transaction: TransactionData,
    userHistory: TransactionData[],
  ): Promise<AnomalyResult> {
    const factors: string[] = [];
    let riskScore = 0;

    // 1. Velocity Check
    const velocityScore = this.checkVelocity(transaction, userHistory);
    riskScore += velocityScore.score;
    factors.push(...velocityScore.factors);

    // 2. Pattern Recognition
    const patternScore = this.checkPatterns(transaction, userHistory);
    riskScore += patternScore.score;
    factors.push(...patternScore.factors);

    // 3. Behavioral Analysis
    const behaviorScore = this.analyzeBehavior(transaction, userHistory);
    riskScore += behaviorScore.score;
    factors.push(...behaviorScore.factors);

    // 4. Amount Analysis
    const amountScore = this.analyzeAmount(transaction, userHistory);
    riskScore += amountScore.score;
    factors.push(...amountScore.factors);

    // 5. Time Pattern Analysis
    const timeScore = this.analyzeTimePatterns(transaction, userHistory);
    riskScore += timeScore.score;
    factors.push(...timeScore.factors);

    const isAnomaly = riskScore >= 60; // Threshold for anomaly

    if (isAnomaly) {
      await this.logSecurityEvent(
        transaction.userId,
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        {
          transaction,
          riskScore,
          factors,
        },
      );
    }

    return { isAnomaly, riskScore, factors };
  }

  /**
   * Check transaction velocity
   */
  private checkVelocity(
    transaction: TransactionData,
    history: TransactionData[],
  ): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    // Last hour transactions
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTxs = history.filter(tx => tx.timestamp > oneHourAgo);

    if (recentTxs.length > 10) {
      score += 20;
      factors.push('High transaction frequency (>10/hour)');
    } else if (recentTxs.length > 5) {
      score += 10;
      factors.push('Elevated transaction frequency (>5/hour)');
    }

    // Calculate volume velocity
    const recentVolume = recentTxs.reduce(
      (sum, tx) => sum.plus(new Decimal(tx.amount)),
      new Decimal(0),
    );

    const avgVolume = history.length > 0
      ? history.reduce((sum, tx) => sum.plus(new Decimal(tx.amount)), new Decimal(0))
          .dividedBy(history.length)
      : new Decimal(0);

    if (recentVolume.greaterThan(avgVolume.times(5))) {
      score += 20;
      factors.push('Unusual volume spike');
    }

    return { score, factors };
  }

  /**
   * Check for suspicious patterns
   */
  private checkPatterns(
    transaction: TransactionData,
    history: TransactionData[],
  ): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    // Check for round numbers (potential structuring)
    const amount = new Decimal(transaction.amount);
    if (amount.mod(1000).equals(0)) {
      score += 5;
      factors.push('Round number transaction');
    }

    // Check for similar amounts in sequence
    const recentAmounts = history.slice(0, 5).map(tx => tx.amount);
    const sameAmountCount = recentAmounts.filter(a => a === transaction.amount).length;
    
    if (sameAmountCount >= 3) {
      score += 15;
      factors.push('Multiple identical transactions');
    }

    // Check for rapid sequential transactions
    if (history.length > 0) {
      const lastTx = history[0];
      const timeDiff = transaction.timestamp.getTime() - lastTx.timestamp.getTime();
      
      if (timeDiff < 10000) { // Less than 10 seconds
        score += 10;
        factors.push('Rapid sequential transactions');
      }
    }

    return { score, factors };
  }

  /**
   * Analyze user behavior
   */
  private analyzeBehavior(
    transaction: TransactionData,
    history: TransactionData[],
  ): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    if (history.length < 5) {
      // New user with large transaction
      const amount = new Decimal(transaction.amount);
      if (amount.greaterThan(1000)) {
        score += 15;
        factors.push('New user with large transaction');
      }
      return { score, factors };
    }

    // Check for deviation from normal behavior
    const avgAmount = history
      .reduce((sum, tx) => sum.plus(new Decimal(tx.amount)), new Decimal(0))
      .dividedBy(history.length);

    const currentAmount = new Decimal(transaction.amount);
    
    if (currentAmount.greaterThan(avgAmount.times(10))) {
      score += 25;
      factors.push('Transaction amount 10x higher than average');
    } else if (currentAmount.greaterThan(avgAmount.times(5))) {
      score += 15;
      factors.push('Transaction amount 5x higher than average');
    }

    // Check for sudden change in transaction type
    const recentTypes = history.slice(0, 10).map(tx => tx.type);
    const commonType = this.getMostCommon(recentTypes);
    
    if (commonType && transaction.type !== commonType) {
      score += 5;
      factors.push('Unusual transaction type');
    }

    return { score, factors };
  }

  /**
   * Analyze transaction amount
   */
  private analyzeAmount(
    transaction: TransactionData,
    history: TransactionData[],
  ): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    const amount = new Decimal(transaction.amount);

    // Very large amounts
    if (amount.greaterThan(100000)) {
      score += 20;
      factors.push('Very large transaction amount');
    } else if (amount.greaterThan(50000)) {
      score += 10;
      factors.push('Large transaction amount');
    }

    // Structuring detection (just below reporting threshold)
    if (amount.greaterThan(9500) && amount.lessThan(10000)) {
      score += 15;
      factors.push('Potential structuring (just below $10k)');
    }

    return { score, factors };
  }

  /**
   * Analyze time patterns
   */
  private analyzeTimePatterns(
    transaction: TransactionData,
    history: TransactionData[],
  ): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    const hour = transaction.timestamp.getHours();

    // Unusual hours (2 AM - 5 AM)
    if (hour >= 2 && hour <= 5) {
      score += 5;
      factors.push('Transaction during unusual hours');
    }

    // Check if this is consistent with user's pattern
    if (history.length >= 10) {
      const userHours = history.map(tx => tx.timestamp.getHours());
      const avgHour = userHours.reduce((a, b) => a + b, 0) / userHours.length;
      
      if (Math.abs(hour - avgHour) > 6) {
        score += 10;
        factors.push('Transaction at unusual time for user');
      }
    }

    return { score, factors };
  }

  /**
   * Calculate and update user risk score
   */
  async calculateRiskScore(userId: string): Promise<RiskScore> {
    // This would use ML model in production
    // For now, we'll use a simplified scoring system

    let existingScore = await this.riskScoreRepository.findOne({
      where: { userId },
    });

    if (!existingScore) {
      existingScore = this.riskScoreRepository.create({
        userId,
        score: 0,
        riskLevel: 'LOW',
        factors: {},
        lastCalculatedAt: new Date(),
      });
    }

    // Calculate various risk factors
    const velocityScore = await this.calculateVelocityScore(userId);
    const patternScore = await this.calculatePatternScore(userId);
    const behaviorScore = await this.calculateBehaviorScore(userId);

    const totalScore = velocityScore + patternScore + behaviorScore;

    existingScore.score = totalScore;
    existingScore.factors = {
      velocityScore,
      patternScore,
      behaviorScore,
    };
    existingScore.lastCalculatedAt = new Date();

    // Determine risk level
    if (totalScore >= 80) {
      existingScore.riskLevel = 'CRITICAL';
    } else if (totalScore >= 60) {
      existingScore.riskLevel = 'HIGH';
    } else if (totalScore >= 40) {
      existingScore.riskLevel = 'MEDIUM';
    } else {
      existingScore.riskLevel = 'LOW';
    }

    return await this.riskScoreRepository.save(existingScore);
  }

  /**
   * Get user risk score
   */
  async getUserRiskScore(userId: string): Promise<RiskScore | null> {
    return await this.riskScoreRepository.findOne({
      where: { userId },
    });
  }

  /**
   * ML-based fraud detection (placeholder)
   */
  async detectFraud(transaction: TransactionData): Promise<{
    isFraud: boolean;
    confidence: number;
    reason: string;
  }> {
    // In production, this would call an ML model
    // For now, return a simple heuristic

    const amount = new Decimal(transaction.amount);
    
    if (amount.greaterThan(100000)) {
      return {
        isFraud: true,
        confidence: 0.85,
        reason: 'Unusually large transaction',
      };
    }

    return {
      isFraud: false,
      confidence: 0.95,
      reason: 'Normal transaction pattern',
    };
  }

  // Helper methods
  private getMostCommon(arr: string[]): string | null {
    if (arr.length === 0) return null;
    
    const counts: Record<string, number> = {};
    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    
    return Object.keys(counts).reduce((a, b) => 
      counts[a] > counts[b] ? a : b
    );
  }

  private async calculateVelocityScore(userId: string): Promise<number> {
    // Placeholder - would analyze transaction velocity
    return 10;
  }

  private async calculatePatternScore(userId: string): Promise<number> {
    // Placeholder - would analyze transaction patterns
    return 10;
  }

  private async calculateBehaviorScore(userId: string): Promise<number> {
    // Placeholder - would analyze user behavior
    return 10;
  }

  private async logSecurityEvent(
    userId: string,
    eventType: SecurityEventType,
    details: Record<string, any>,
  ): Promise<void> {
    const event = this.securityEventRepository.create({
      userId,
      eventType,
      riskLevel: RiskLevel.HIGH,
      details,
    });

    await this.securityEventRepository.save(event);
  }
}
