import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  TransactionMonitoring,
  MonitoringStatus,
} from '../entities/transaction-monitoring.entity';
import {
  SuspiciousActivity,
  SARStatus,
  SARType,
} from '../entities/suspicious-activity.entity';

@Injectable()
export class TransactionMonitoringService {
  private readonly logger = new Logger(TransactionMonitoringService.name);

  private readonly CTR_THRESHOLD: number;
  private readonly SAR_THRESHOLD: number;

  constructor(
    @InjectRepository(TransactionMonitoring)
    private transactionMonitoringRepo: Repository<TransactionMonitoring>,
    @InjectRepository(SuspiciousActivity)
    private suspiciousActivityRepo: Repository<SuspiciousActivity>,
    private configService: ConfigService,
  ) {
    this.CTR_THRESHOLD = this.configService.get('TXN_CTR_THRESHOLD', 10000);
    this.SAR_THRESHOLD = this.configService.get('TXN_SUSPICIOUS_THRESHOLD', 10000);
  }

  /**
   * Screen a transaction in real-time
   */
  async screenTransaction(data: {
    transactionId: string;
    userId: string;
    transactionType: string;
    amount: number;
    currency: string;
    fromAddress?: string;
    toAddress?: string;
    blockchainHash?: string;
  }): Promise<TransactionMonitoring> {
    this.logger.log(`Screening transaction ${data.transactionId}`);

    const flags: string[] = [];
    let riskScore = 0;
    let status = MonitoringStatus.CLEAR;

    // Check if high-value transaction
    const isHighValue = data.amount >= this.SAR_THRESHOLD;
    if (isHighValue) {
      flags.push('high_value');
      riskScore += 30;
    }

    // Check if CTR reportable
    const isCtrReportable = data.amount >= this.CTR_THRESHOLD;
    if (isCtrReportable) {
      flags.push('ctr_reportable');
    }

    // Check for structuring (multiple transactions just below threshold)
    const structuringDetected = await this.detectStructuring(data.userId, data.amount);
    if (structuringDetected) {
      flags.push('potential_structuring');
      riskScore += 50;
      status = MonitoringStatus.FLAGGED;
    }

    // Check for rapid movement
    const rapidMovement = await this.detectRapidMovement(data.userId);
    if (rapidMovement) {
      flags.push('rapid_movement');
      riskScore += 40;
      status = MonitoringStatus.FLAGGED;
    }

    // Blockchain analysis with Chainalysis
    let chainalysisResult = null;
    if (data.toAddress) {
      chainalysisResult = await this.analyzeWithChainalysis(data.toAddress);
      if (chainalysisResult?.risk === 'high') {
        flags.push('high_risk_address');
        riskScore += 60;
        status = MonitoringStatus.BLOCKED;
      }
    }

    // Travel Rule check (for transactions > $1000 to other VASPs)
    const isTravelRule = data.amount >= 1000 && !!data.toAddress;

    // Create monitoring record
    const monitoring = this.transactionMonitoringRepo.create({
      transactionId: data.transactionId,
      userId: data.userId,
      transactionType: data.transactionType,
      amount: data.amount,
      currency: data.currency,
      fromAddress: data.fromAddress,
      toAddress: data.toAddress,
      blockchainHash: data.blockchainHash,
      status,
      riskScore,
      flags,
      chainalysisResult,
      isHighValue,
      isCtrReportable,
      isTravelRule,
    });

    await this.transactionMonitoringRepo.save(monitoring);

    // Auto-create SAR if highly suspicious
    if (riskScore >= 70) {
      await this.createSuspiciousActivity(
        data.userId,
        data.transactionId,
        this.determineSARType(flags),
        `High risk score: ${riskScore}`,
        riskScore,
        { flags, amount: data.amount, currency: data.currency },
      );
    }

    return monitoring;
  }

  /**
   * Detect structuring pattern
   */
  private async detectStructuring(userId: string, _amount: number): Promise<boolean> {
    // Check for multiple transactions just below reporting threshold in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTransactions = await this.transactionMonitoringRepo
      .createQueryBuilder('tm')
      .where('tm.user_id = :userId', { userId })
      .andWhere('tm.created_at > :oneDayAgo', { oneDayAgo })
      .andWhere('tm.amount > :minAmount', { minAmount: this.CTR_THRESHOLD * 0.5 })
      .andWhere('tm.amount < :threshold', { threshold: this.CTR_THRESHOLD })
      .getMany();

    if (recentTransactions.length >= 3) {
      const totalAmount = recentTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
      if (totalAmount > this.CTR_THRESHOLD) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect rapid movement (in and out quickly)
   */
  private async detectRapidMovement(userId: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTransactions = await this.transactionMonitoringRepo
      .createQueryBuilder('tm')
      .where('tm.user_id = :userId', { userId })
      .andWhere('tm.created_at > :oneHourAgo', { oneHourAgo })
      .getMany();

    // Check for deposit followed by immediate withdrawal
    const deposits = recentTransactions.filter((tx) => tx.transactionType === 'deposit');
    const withdrawals = recentTransactions.filter((tx) => tx.transactionType === 'withdrawal');

    return deposits.length > 0 && withdrawals.length > 0;
  }

  /**
   * Analyze blockchain address with Chainalysis
   */
  private async analyzeWithChainalysis(address: string): Promise<any> {
    const apiKey = this.configService.get('CHAINALYSIS_API_KEY');
    const apiUrl = this.configService.get('CHAINALYSIS_API_URL');

    if (!apiKey || !apiUrl) {
      this.logger.warn('Chainalysis not configured');
      return null;
    }

    try {
      const response = await axios.get(`${apiUrl}/v1/addresses/${address}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      return {
        risk: response.data.risk,
        category: response.data.category,
        cluster: response.data.cluster,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Chainalysis analysis failed: ${message}`);
      return null;
    }
  }

  /**
   * Create suspicious activity report
   */
  async createSuspiciousActivity(
    userId: string,
    transactionId: string,
    type: SARType,
    reason: string,
    riskScore: number,
    details?: Record<string, any>,
  ): Promise<SuspiciousActivity> {
    this.logger.warn(`Creating SAR for user ${userId}: ${reason}`);

    const sar = this.suspiciousActivityRepo.create({
      userId,
      transactionId,
      type,
      reason,
      riskScore,
      details,
      status: SARStatus.DETECTED,
      detectedAt: new Date(),
    });

    return await this.suspiciousActivityRepo.save(sar);
  }

  /**
   * Determine SAR type from flags
   */
  private determineSARType(flags: string[]): SARType {
    if (flags.includes('potential_structuring')) return SARType.STRUCTURING;
    if (flags.includes('rapid_movement')) return SARType.RAPID_MOVEMENT;
    if (flags.includes('high_risk_address')) return SARType.BLACKLIST_INTERACTION;
    return SARType.UNUSUAL_PATTERN;
  }

  /**
   * Review flagged transaction
   */
  async reviewTransaction(
    transactionId: string,
    status: MonitoringStatus,
    reviewedBy: string,
    notes?: string,
  ): Promise<TransactionMonitoring> {
    const monitoring = await this.transactionMonitoringRepo.findOne({
      where: { transactionId },
    });

    if (!monitoring) {
      throw new Error('Transaction monitoring record not found');
    }

    monitoring.status = status;
    monitoring.reviewedBy = reviewedBy;
    monitoring.reviewedAt = new Date();
    if (notes) {
      monitoring.notes = notes;
    }

    return await this.transactionMonitoringRepo.save(monitoring);
  }

  /**
   * Get suspicious activities for review
   */
  async getSuspiciousActivities(status?: SARStatus): Promise<SuspiciousActivity[]> {
    const query: any = {};
    if (status) {
      query.status = status;
    }

    return await this.suspiciousActivityRepo.find({
      where: query,
      order: { detectedAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * Report SAR to authorities
   */
  async reportSARToAuthorities(sarId: string, reportedBy: string): Promise<SuspiciousActivity> {
    const sar = await this.suspiciousActivityRepo.findOne({ where: { id: sarId } });

    if (!sar) {
      throw new Error('SAR not found');
    }

    // In production, this would submit to FinCEN or other regulatory body
    const reportReference = `SAR-${Date.now()}-${sarId.substring(0, 8)}`;

    sar.status = SARStatus.REPORTED;
    sar.reportedToAuthority = true;
    sar.reportedAt = new Date();
    sar.reportReference = reportReference;
    sar.reviewedBy = reportedBy;
    sar.reviewedAt = new Date();

    return await this.suspiciousActivityRepo.save(sar);
  }

  /**
   * Get transaction monitoring statistics
   */
  async getMonitoringStats(): Promise<any> {
    const totalMonitored = await this.transactionMonitoringRepo.count();
    const flagged = await this.transactionMonitoringRepo.count({
      where: { status: MonitoringStatus.FLAGGED },
    });
    const blocked = await this.transactionMonitoringRepo.count({
      where: { status: MonitoringStatus.BLOCKED },
    });
    const ctrReportable = await this.transactionMonitoringRepo.count({
      where: { isCtrReportable: true },
    });

    const totalSARs = await this.suspiciousActivityRepo.count();
    const pendingSARs = await this.suspiciousActivityRepo.count({
      where: { status: SARStatus.DETECTED },
    });
    const reportedSARs = await this.suspiciousActivityRepo.count({
      where: { status: SARStatus.REPORTED },
    });

    return {
      totalMonitored,
      flagged,
      blocked,
      ctrReportable,
      totalSARs,
      pendingSARs,
      reportedSARs,
    };
  }
}
