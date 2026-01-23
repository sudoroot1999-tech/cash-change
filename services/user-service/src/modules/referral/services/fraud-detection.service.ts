import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FraudDetection, ReferralRelationship, ReferralCommission } from '../entities';

interface FraudCheckResult {
  isSuspicious: boolean;
  fraudType?: string;
  riskScore: number;
  reason?: string;
  evidence?: any;
}

@Injectable()
export class FraudDetectionService {
  constructor(
    @InjectRepository(FraudDetection)
    private readonly fraudRepo: Repository<FraudDetection>,
    @InjectRepository(ReferralRelationship)
    private readonly relationshipRepo: Repository<ReferralRelationship>,
    @InjectRepository(ReferralCommission)
    private readonly commissionRepo: Repository<ReferralCommission>,
    private readonly configService: ConfigService,
  ) {}

  async checkNewReferral(
    referrerId: string,
    refereeId: string,
    ipAddress?: string,
    deviceFingerprint?: string,
  ): Promise<FraudCheckResult> {
    const fraudEnabled = this.configService.get<boolean>('ENABLE_FRAUD_DETECTION', true);
    if (!fraudEnabled) {
      return { isSuspicious: false, riskScore: 0 };
    }

    let riskScore = 0;
    const evidence: any = {};

    // Check for self-referral
    if (referrerId === refereeId) {
      return {
        isSuspicious: true,
        fraudType: 'self_referral',
        riskScore: 1.0,
        reason: 'User attempted to refer themselves',
        evidence: { referrerId, refereeId },
      };
    }

    // Check IP abuse
    if (ipAddress) {
      const ipCheckResult = await this.checkIpAbuse(ipAddress, referrerId);
      if (ipCheckResult.isSuspicious) {
        riskScore += 0.4;
        evidence.ipAbuse = ipCheckResult.evidence;
      }
    }

    // Check device fingerprint abuse
    if (deviceFingerprint) {
      const deviceCheckResult = await this.checkDeviceAbuse(deviceFingerprint, referrerId);
      if (deviceCheckResult.isSuspicious) {
        riskScore += 0.4;
        evidence.deviceAbuse = deviceCheckResult.evidence;
      }
    }

    // Check velocity abuse (too many referrals in short time)
    const velocityCheck = await this.checkVelocityAbuse(referrerId);
    if (velocityCheck.isSuspicious) {
      riskScore += 0.3;
      evidence.velocityAbuse = velocityCheck.evidence;
    }

    // Check for suspicious patterns
    const patternCheck = await this.checkSuspiciousPatterns(referrerId, refereeId);
    if (patternCheck.isSuspicious) {
      riskScore += 0.2;
      evidence.suspiciousPattern = patternCheck.evidence;
    }

    const threshold = this.configService.get<number>('SUSPICIOUS_PATTERN_THRESHOLD', 0.7);
    const isSuspicious = riskScore >= threshold;

    if (isSuspicious) {
      // Log fraud detection
      await this.logFraudDetection({
        userId: refereeId,
        fraudType: 'suspicious_pattern',
        riskScore,
        reason: 'Multiple fraud indicators detected',
        evidence,
      });
    }

    return {
      isSuspicious,
      fraudType: isSuspicious ? 'suspicious_pattern' : undefined,
      riskScore,
      reason: isSuspicious ? 'Multiple fraud indicators detected' : undefined,
      evidence: isSuspicious ? evidence : undefined,
    };
  }

  private async checkIpAbuse(ipAddress: string, referrerId: string): Promise<FraudCheckResult> {
    const maxSignupsPerIp = this.configService.get<number>('MAX_SIGNUPS_PER_IP', 3);
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const relationships = await this.relationshipRepo.find({
      where: {
        referrerId,
        createdAt: MoreThan(last24Hours),
      },
    });

    const sameIpCount = relationships.filter(
      (r) => r.metadata?.ipAddress === ipAddress,
    ).length;

    const isSuspicious = sameIpCount >= maxSignupsPerIp;

    return {
      isSuspicious,
      fraudType: isSuspicious ? 'ip_abuse' : undefined,
      riskScore: isSuspicious ? 0.8 : 0,
      evidence: {
        ipAddress,
        sameIpCount,
        maxAllowed: maxSignupsPerIp,
      },
    };
  }

  private async checkDeviceAbuse(
    deviceFingerprint: string,
    referrerId: string,
  ): Promise<FraudCheckResult> {
    const maxSignupsPerDevice = this.configService.get<number>('MAX_SIGNUPS_PER_DEVICE', 5);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const relationships = await this.relationshipRepo.find({
      where: {
        referrerId,
        createdAt: MoreThan(last7Days),
      },
    });

    const sameDeviceCount = relationships.filter(
      (r) => r.metadata?.deviceFingerprint === deviceFingerprint,
    ).length;

    const isSuspicious = sameDeviceCount >= maxSignupsPerDevice;

    return {
      isSuspicious,
      fraudType: isSuspicious ? 'device_abuse' : undefined,
      riskScore: isSuspicious ? 0.8 : 0,
      evidence: {
        deviceFingerprint,
        sameDeviceCount,
        maxAllowed: maxSignupsPerDevice,
      },
    };
  }

  private async checkVelocityAbuse(referrerId: string): Promise<FraudCheckResult> {
    const last1Hour = new Date(Date.now() - 60 * 60 * 1000);

    const recentReferrals = await this.relationshipRepo.count({
      where: {
        referrerId,
        createdAt: MoreThan(last1Hour),
      },
    });

    // More than 10 referrals in 1 hour is suspicious
    const isSuspicious = recentReferrals > 10;

    return {
      isSuspicious,
      fraudType: isSuspicious ? 'velocity_abuse' : undefined,
      riskScore: isSuspicious ? 0.7 : 0,
      evidence: {
        recentReferrals,
        timeWindow: '1 hour',
      },
    };
  }

  private async checkSuspiciousPatterns(
    referrerId: string,
    refereeId: string,
  ): Promise<FraudCheckResult> {
    // Check if referee has been referred by multiple people recently
    const refereeRelationships = await this.relationshipRepo.find({
      where: { refereeId },
    });

    if (refereeRelationships.length > 1) {
      return {
        isSuspicious: true,
        fraudType: 'duplicate_account',
        riskScore: 0.9,
        evidence: {
          multipleReferrers: refereeRelationships.map((r) => r.referrerId),
        },
      };
    }

    // Check if all referrals have similar timing patterns
    const allReferrals = await this.relationshipRepo.find({
      where: { referrerId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    if (allReferrals.length >= 5) {
      const intervals = [];
      for (let i = 1; i < allReferrals.length; i++) {
        const interval =
          allReferrals[i - 1].createdAt.getTime() - allReferrals[i].createdAt.getTime();
        intervals.push(interval);
      }

      // Check if intervals are suspiciously regular (bot behavior)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance =
        intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) /
        intervals.length;
      const stdDev = Math.sqrt(variance);

      // Low standard deviation indicates regular timing (bot-like)
      const isBotLike = stdDev < avgInterval * 0.1 && avgInterval < 5 * 60 * 1000; // Less than 5 minutes

      if (isBotLike) {
        return {
          isSuspicious: true,
          fraudType: 'bot_activity',
          riskScore: 0.85,
          evidence: {
            regularIntervals: true,
            avgInterval: avgInterval / 1000, // in seconds
            stdDev: stdDev / 1000,
          },
        };
      }
    }

    return {
      isSuspicious: false,
      riskScore: 0,
    };
  }

  async logFraudDetection(data: {
    userId?: string;
    referralRelationshipId?: string;
    fraudType: string;
    riskScore: number;
    reason: string;
    evidence: any;
  }): Promise<FraudDetection> {
    const detection = this.fraudRepo.create({
      userId: data.userId,
      referralRelationshipId: data.referralRelationshipId,
      fraudType: data.fraudType as any,
      riskScore: data.riskScore,
      reason: data.reason,
      evidence: data.evidence,
      status: 'flagged',
      action: data.riskScore >= 0.8 ? 'block_commissions' : 'require_verification',
      metadata: {
        autoDetected: true,
        detectionSource: 'referral_service',
        confidence: data.riskScore,
      },
    });

    return await this.fraudRepo.save(detection);
  }

  async getFraudDetections(
    filters?: {
      userId?: string;
      status?: string;
      fraudType?: string;
    },
  ): Promise<FraudDetection[]> {
    const where: any = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.status) where.status = filters.status;
    if (filters?.fraudType) where.fraudType = filters.fraudType;

    return await this.fraudRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async reviewFraudCase(
    detectionId: string,
    reviewerId: string,
    action: 'confirmed' | 'false_positive' | 'resolved',
    notes?: string,
  ): Promise<FraudDetection> {
    const detection = await this.fraudRepo.findOne({
      where: { id: detectionId },
    });

    if (!detection) {
      throw new Error('Fraud detection not found');
    }

    detection.status = action === 'confirmed' ? 'confirmed' : action;
    detection.reviewedBy = reviewerId;
    detection.reviewedAt = new Date();
    detection.reviewNotes = notes;
    detection.isResolved = action === 'resolved' || action === 'false_positive';

    if (action === 'confirmed') {
      detection.action = 'suspend_account';
      
      // Block commissions for this relationship
      if (detection.referralRelationshipId) {
        await this.blockRelationshipCommissions(detection.referralRelationshipId);
      }
    }

    return await this.fraudRepo.save(detection);
  }

  private async blockRelationshipCommissions(relationshipId: string): Promise<void> {
    const relationship = await this.relationshipRepo.findOne({
      where: { id: relationshipId },
    });

    if (relationship) {
      relationship.status = 'suspended';
      await this.relationshipRepo.save(relationship);

      // Reject pending commissions
      const pendingCommissions = await this.commissionRepo.find({
        where: {
          relationshipId,
          status: 'pending',
        },
      });

      for (const commission of pendingCommissions) {
        commission.status = 'rejected';
        await this.commissionRepo.save(commission);
      }
    }
  }

  async getSystemFraudStats() {
    const all = await this.fraudRepo.count();
    const flagged = await this.fraudRepo.count({ where: { status: 'flagged' } });
    const investigating = await this.fraudRepo.count({ where: { status: 'investigating' } });
    const confirmed = await this.fraudRepo.count({ where: { status: 'confirmed' } });
    const falsePositives = await this.fraudRepo.count({ where: { status: 'false_positive' } });

    const byType = await this.fraudRepo
      .createQueryBuilder('fraud')
      .select('fraud.fraudType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('fraud.fraudType')
      .getRawMany();

    return {
      total: all,
      byStatus: {
        flagged,
        investigating,
        confirmed,
        falsePositives,
      },
      byType: byType.map((t) => ({
        type: t.type,
        count: parseInt(t.count),
      })),
    };
  }
}
