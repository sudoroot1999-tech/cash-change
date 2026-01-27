import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FraudDetection, FraudType, FraudSeverity } from '../entities/fraud-detection.entity';
import { XpTransaction, XpSource } from '../entities/xp-transaction.entity';
import { MiniGame, MiniGameType } from '../entities/mini-game.entity';
import { UserMission } from '../entities/user-mission.entity';

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  private readonly maxXpPerHour: number;
  private readonly maxMissionsPerHour: number;
  private readonly suspiciousThreshold: number;

  constructor(
    @InjectRepository(FraudDetection)
    private readonly fraudDetectionRepository: Repository<FraudDetection>,
    @InjectRepository(XpTransaction)
    private readonly xpTransactionRepository: Repository<XpTransaction>,
    @InjectRepository(MiniGame)
    private readonly miniGameRepository: Repository<MiniGame>,
    @InjectRepository(UserMission)
    private readonly userMissionRepository: Repository<UserMission>,
    private readonly configService: ConfigService,
  ) {
    this.maxXpPerHour = this.configService.get<number>('MAX_XP_PER_HOUR', 1000);
    this.maxMissionsPerHour = this.configService.get<number>('MAX_MISSIONS_PER_HOUR', 50);
    this.suspiciousThreshold = this.configService.get<number>(
      'SUSPICIOUS_ACTIVITY_THRESHOLD',
      0.8,
    );
  }

  async checkXpGain(userId: string, amount: number, source: XpSource): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Check recent XP gain
    const recentTransactions = await this.xpTransactionRepository.find({
      where: {
        userId,
        createdAt: MoreThan(oneHourAgo),
      },
    });

    const totalRecentXp = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    if (totalRecentXp + amount > this.maxXpPerHour) {
      await this.createFraudAlert({
        userId,
        type: FraudType.SUSPICIOUS_XP_GAIN,
        severity: FraudSeverity.HIGH,
        description: `Exceeded max XP per hour: ${totalRecentXp + amount} XP`,
        evidence: {
          amount,
          source,
          totalRecentXp,
          threshold: this.maxXpPerHour,
        },
        riskScore: 0.9,
      });

      return true;
    }

    // Check for unusual patterns
    const sourceCounts = recentTransactions.reduce((acc, tx) => {
      acc[tx.source] = (acc[tx.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxCount = Math.max(...Object.values(sourceCounts));
    if (maxCount > 20) {
      // Same source more than 20 times in an hour
      await this.createFraudAlert({
        userId,
        type: FraudType.SUSPICIOUS_XP_GAIN,
        severity: FraudSeverity.MEDIUM,
        description: `Unusual XP pattern detected: ${maxCount} transactions from same source`,
        evidence: {
          sourceCounts,
          source,
        },
        riskScore: 0.7,
      });

      return true;
    }

    return false;
  }

  async checkMissionAbuse(userId: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentMissions = await this.userMissionRepository.count({
      where: {
        userId,
        completedAt: MoreThan(oneHourAgo),
      },
    });

    if (recentMissions > this.maxMissionsPerHour) {
      await this.createFraudAlert({
        userId,
        type: FraudType.MISSION_ABUSE,
        severity: FraudSeverity.HIGH,
        description: `Too many missions completed: ${recentMissions} in the last hour`,
        evidence: {
          missionCount: recentMissions,
          threshold: this.maxMissionsPerHour,
        },
        riskScore: 0.85,
      });

      return true;
    }

    return false;
  }

  async checkGameAbuse(userId: string, gameType: MiniGameType): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentGames = await this.miniGameRepository.find({
      where: {
        userId,
        gameType,
        createdAt: MoreThan(oneHourAgo),
      },
    });

    // Check game frequency
    if (recentGames.length > 50) {
      await this.createFraudAlert({
        userId,
        type: FraudType.GAME_MANIPULATION,
        severity: FraudSeverity.MEDIUM,
        description: `Too many games played: ${recentGames.length} ${gameType} games in the last hour`,
        evidence: {
          gameType,
          gameCount: recentGames.length,
        },
        riskScore: 0.75,
      });

      return true;
    }

    // Check win rate (for games with win/loss)
    const wins = recentGames.filter(g => g.isWin).length;
    const winRate = wins / recentGames.length;

    if (recentGames.length > 10 && winRate > 0.9) {
      // Suspicious win rate
      await this.createFraudAlert({
        userId,
        type: FraudType.GAME_MANIPULATION,
        severity: FraudSeverity.HIGH,
        description: `Suspicious win rate: ${(winRate * 100).toFixed(1)}%`,
        evidence: {
          gameType,
          totalGames: recentGames.length,
          wins,
          winRate,
        },
        riskScore: 0.95,
      });

      return true;
    }

    return false;
  }

  async checkAccountSharing(userId: string, metadata: Record<string, any>): Promise<boolean> {
    // Check for multiple IPs, devices, or locations in short time
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentActivities = await this.xpTransactionRepository.find({
      where: {
        userId,
        createdAt: MoreThan(oneHourAgo),
      },
    });

    const uniqueIPs = new Set(
      recentActivities
        .map(a => a.metadata?.ip)
        .filter(ip => ip),
    );

    if (uniqueIPs.size > 3) {
      await this.createFraudAlert({
        userId,
        type: FraudType.ACCOUNT_SHARING,
        severity: FraudSeverity.MEDIUM,
        description: `Multiple IPs detected: ${uniqueIPs.size} different IPs in the last hour`,
        evidence: {
          uniqueIPs: Array.from(uniqueIPs),
          activityCount: recentActivities.length,
        },
        riskScore: 0.7,
      });

      return true;
    }

    return false;
  }

  async checkBotActivity(userId: string): Promise<boolean> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentTransactions = await this.xpTransactionRepository.find({
      where: {
        userId,
        createdAt: MoreThan(fiveMinutesAgo),
      },
      order: { createdAt: 'ASC' },
    });

    if (recentTransactions.length < 5) {
      return false;
    }

    // Check for perfectly timed intervals (bot-like behavior)
    const intervals: number[] = [];
    for (let i = 1; i < recentTransactions.length; i++) {
      const interval =
        recentTransactions[i].createdAt.getTime() -
        recentTransactions[i - 1].createdAt.getTime();
      intervals.push(interval);
    }

    // Calculate standard deviation
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // If standard deviation is very low, it might be bot activity
    if (stdDev < 1000 && intervals.length > 5) {
      // Less than 1 second variance
      await this.createFraudAlert({
        userId,
        type: FraudType.BOT_ACTIVITY,
        severity: FraudSeverity.HIGH,
        description: 'Bot-like activity pattern detected',
        evidence: {
          transactionCount: recentTransactions.length,
          meanInterval: mean,
          stdDev,
          intervals,
        },
        riskScore: 0.9,
      });

      return true;
    }

    return false;
  }

  async getUserRiskScore(userId: string): Promise<number> {
    const recentAlerts = await this.fraudDetectionRepository.find({
      where: {
        userId,
        isResolved: false,
        createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      },
    });

    if (recentAlerts.length === 0) {
      return 0;
    }

    // Calculate weighted average of risk scores
    const totalRiskScore = recentAlerts.reduce(
      (sum, alert) => sum + Number(alert.riskScore),
      0,
    );

    return Math.min(1, totalRiskScore / recentAlerts.length);
  }

  async getFraudAlerts(
    userId?: string,
    resolved?: boolean,
    limit: number = 100,
  ): Promise<FraudDetection[]> {
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (resolved !== undefined) {
      where.isResolved = resolved;
    }

    return this.fraudDetectionRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async resolveAlert(
    alertId: string,
    resolvedBy: string,
    notes?: string,
  ): Promise<FraudDetection> {
    const alert = await this.fraudDetectionRepository.findOne({
      where: { id: alertId },
    });

    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.isResolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;
    if (notes) {
      alert.notes = notes;
    }

    return this.fraudDetectionRepository.save(alert);
  }

  private async createFraudAlert(data: {
    userId: string;
    type: FraudType;
    severity: FraudSeverity;
    description: string;
    evidence: Record<string, any>;
    riskScore: number;
  }): Promise<FraudDetection> {
    const alert = this.fraudDetectionRepository.create(data);
    await this.fraudDetectionRepository.save(alert);

    this.logger.warn(
      `Fraud alert created for user ${data.userId}: ${data.type} (Risk: ${data.riskScore})`,
    );

    return alert;
  }
}
