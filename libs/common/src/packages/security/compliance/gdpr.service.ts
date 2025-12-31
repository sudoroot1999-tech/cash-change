import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import * as crypto from 'crypto';

export interface DataExportRequest {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface DataDeletionRequest {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  scheduledFor: Date;
  completedAt?: Date;
  retentionReason?: string;
}

export interface ConsentRecord {
  userId: string;
  type: string;
  granted: boolean;
  grantedAt: Date;
  revokedAt?: Date;
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class GDPRService {
  private readonly logger = new Logger(GDPRService.name);
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  /**
   * Request data export (GDPR Article 15 - Right of Access)
   */
  async requestDataExport(userId: string): Promise<DataExportRequest> {
    const id = crypto.randomBytes(16).toString('hex');

    const request: DataExportRequest = {
      id,
      userId,
      status: 'pending',
      requestedAt: new Date(),
    };

    await this.redis.set(
      `data_export:${id}`,
      JSON.stringify(request),
      'EX',
      30 * 24 * 60 * 60, // 30 days
    );

    await this.redis.sadd('pending_data_exports', id);

    this.logger.log(`Data export requested by user ${userId}`);

    return request;
  }

  /**
   * Process data export
   */
  async processDataExport(requestId: string): Promise<void> {
    const data = await this.redis.get(`data_export:${requestId}`);
    if (!data) {
      throw new Error('Export request not found');
    }

    const request: DataExportRequest = JSON.parse(data);
    request.status = 'processing';

    await this.redis.set(`data_export:${requestId}`, JSON.stringify(request));

    try {
      // In production, this would collect all user data from various services
      // and create a downloadable archive
      const exportData = await this.collectUserData(request.userId);
      
      // Generate download URL (in production, upload to S3 or similar)
      const downloadUrl = `/api/data-export/${requestId}/download`;
      
      request.status = 'completed';
      request.completedAt = new Date();
      request.downloadUrl = downloadUrl;
      request.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await this.redis.set(`data_export:${requestId}`, JSON.stringify(request));
      await this.redis.srem('pending_data_exports', requestId);

      this.logger.log(`Data export completed for request ${requestId}`);
    } catch (error:any) {
      request.status = 'failed';
      await this.redis.set(`data_export:${requestId}`, JSON.stringify(request));
      this.logger.error(`Data export failed for request ${requestId}: ${error.message}`);
    }
  }

  /**
   * Request data deletion (GDPR Article 17 - Right to Erasure)
   */
  async requestDataDeletion(
    userId: string,
    immediate: boolean = false,
  ): Promise<DataDeletionRequest> {
    const id = crypto.randomBytes(16).toString('hex');
    
    // Check if there are legal retention requirements
    const retentionReason = await this.checkRetentionRequirements(userId);

    const scheduledFor = immediate
      ? new Date()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days grace period

    const request: DataDeletionRequest = {
      id,
      userId,
      status: 'pending',
      requestedAt: new Date(),
      scheduledFor,
      retentionReason,
    };

    await this.redis.set(
      `data_deletion:${id}`,
      JSON.stringify(request),
      'EX',
      90 * 24 * 60 * 60, // 90 days
    );

    await this.redis.sadd('pending_data_deletions', id);

    this.logger.log(`Data deletion requested by user ${userId}, scheduled for ${scheduledFor}`);

    return request;
  }

  /**
   * Process data deletion
   */
  async processDataDeletion(requestId: string): Promise<void> {
    const data = await this.redis.get(`data_deletion:${requestId}`);
    if (!data) {
      throw new Error('Deletion request not found');
    }

    const request: DataDeletionRequest = JSON.parse(data);

    if (new Date() < new Date(request.scheduledFor)) {
      throw new Error('Deletion not yet scheduled');
    }

    request.status = 'processing';
    await this.redis.set(`data_deletion:${requestId}`, JSON.stringify(request));

    try {
      // In production, this would delete/anonymize user data across all services
      await this.deleteUserData(request.userId);

      request.status = 'completed';
      request.completedAt = new Date();

      await this.redis.set(`data_deletion:${requestId}`, JSON.stringify(request));
      await this.redis.srem('pending_data_deletions', requestId);

      this.logger.log(`Data deletion completed for request ${requestId}`);
    } catch (error:any) {
      request.status = 'failed';
      await this.redis.set(`data_deletion:${requestId}`, JSON.stringify(request));
      this.logger.error(`Data deletion failed for request ${requestId}: ${error.message}`);
    }
  }

  /**
   * Record consent (GDPR Article 7)
   */
  async recordConsent(
    userId: string,
    type: string,
    granted: boolean,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const record: ConsentRecord = {
      userId,
      type,
      granted,
      grantedAt: new Date(),
      ipAddress,
      userAgent,
    };

    const key = `consent:${userId}:${type}`;
    await this.redis.set(key, JSON.stringify(record));

    // Also store in consent history
    await this.redis.lpush(`consent_history:${userId}`, JSON.stringify(record));
    await this.redis.ltrim(`consent_history:${userId}`, 0, 99);

    this.logger.log(`Consent ${granted ? 'granted' : 'revoked'} for user ${userId}: ${type}`);
  }

  /**
   * Check consent
   */
  async checkConsent(userId: string, type: string): Promise<boolean> {
    const data = await this.redis.get(`consent:${userId}:${type}`);
    if (!data) {
      return false;
    }

    const record: ConsentRecord = JSON.parse(data);
    return record.granted && !record.revokedAt;
  }

  /**
   * Revoke consent
   */
  async revokeConsent(
    userId: string,
    type: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const data = await this.redis.get(`consent:${userId}:${type}`);
    if (data) {
      const record: ConsentRecord = JSON.parse(data);
      record.granted = false;
      record.revokedAt = new Date();
      await this.redis.set(`consent:${userId}:${type}`, JSON.stringify(record));
    }

    // Record in history
    await this.recordConsent(userId, type, false, ipAddress, userAgent);
  }

  /**
   * Get consent history
   */
  async getConsentHistory(userId: string): Promise<ConsentRecord[]> {
    const history = await this.redis.lrange(`consent_history:${userId}`, 0, -1);
    return history.map((h) => JSON.parse(h));
  }

  /**
   * Anonymize user data (for retention requirements)
   */
  async anonymizeUserData(userId: string): Promise<void> {
    // In production, this would anonymize PII while keeping transaction records
    // for legal/compliance requirements
    
    const anonymizedId = crypto.createHash('sha256').update(userId).digest('hex');
    
    await this.redis.set(`anonymized_user:${userId}`, anonymizedId);
    
    this.logger.log(`User ${userId} data anonymized`);
  }

  /**
   * Collect user data for export
   */
  private async collectUserData(userId: string): Promise<any> {
    // In production, this would collect data from all services
    return {
      userId,
      profile: {},
      transactions: [],
      orders: [],
      consents: await this.getConsentHistory(userId),
      exportedAt: new Date(),
    };
  }

  /**
   * Delete user data
   */
  private async deleteUserData(userId: string): Promise<void> {
    // In production, this would trigger deletion across all services
    // Some data may need to be anonymized instead of deleted due to legal requirements
    
    const retentionReason = await this.checkRetentionRequirements(userId);
    
    if (retentionReason) {
      await this.anonymizeUserData(userId);
    } else {
      // Delete all user data
      await this.redis.del(`user:${userId}`);
      await this.redis.del(`consent_history:${userId}`);
    }
  }

  /**
   * Check retention requirements
   */
  private async checkRetentionRequirements(userId: string): Promise<string | undefined> {
    // Check for legal retention requirements (e.g., AML, tax records)
    const hasOpenInvestigation = await this.redis.exists(`investigation:${userId}`);
    if (hasOpenInvestigation) {
      return 'Open investigation';
    }

    const hasPendingSAR = await this.redis.sismember('users_with_sars', userId);
    if (hasPendingSAR) {
      return 'Suspicious activity report filed';
    }

    // Check for recent transactions (tax retention)
    const recentTransactions = await this.redis.lrange(`user_transactions:${userId}`, 0, 0);
    if (recentTransactions.length > 0) {
      const lastTx = JSON.parse(recentTransactions[0]);
      const txDate = new Date(lastTx.timestamp);
      const retentionPeriod = 7 * 365 * 24 * 60 * 60 * 1000; // 7 years
      
      if (Date.now() - txDate.getTime() < retentionPeriod) {
        return 'Tax retention requirement (7 years)';
      }
    }

    return undefined;
  }

  /**
   * Get data retention policy
   */
  getRetentionPolicy(): Record<string, string> {
    return {
      'user_profile': '7 years after account closure',
      'transaction_records': '7 years (tax requirement)',
      'kyc_documents': '5 years after relationship ends',
      'audit_logs': '7 years',
      'consent_records': '3 years after revocation',
      'communication_logs': '3 years',
      'session_data': '90 days',
    };
  }
}
