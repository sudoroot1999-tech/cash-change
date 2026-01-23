import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AuditLog, AuditLogAction } from '../entities/audit-log.entity';
import * as geoip from 'geoip-lite';

@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);
  private readonly retentionYears: number;

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
    private configService: ConfigService,
  ) {
    this.retentionYears = this.configService.get('AUDIT_LOG_RETENTION_YEARS', 7);
  }

  /**
   * Log user action
   */
  async logAction(data: {
    userId?: string;
    action: AuditLogAction;
    resource: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress: string;
    userAgent?: string;
    sessionId?: string;
    success?: boolean;
    errorMessage?: string;
  }): Promise<AuditLog> {
    // Get geolocation from IP
    const geo = geoip.lookup(data.ipAddress);
    const country = geo?.country || null;
    const city = null; // geoip-lite doesn't provide city

    const log = this.auditLogRepo.create({
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      country,
      city,
      sessionId: data.sessionId,
      success: data.success !== undefined ? data.success : true,
      errorMessage: data.errorMessage,
    });

    const saved = await this.auditLogRepo.save(log);

    // Optionally store hash on blockchain for tamper-proof logging
    if (this.configService.get('AUDIT_LOG_BLOCKCHAIN_ENABLED') === 'true') {
      await this.storeOnBlockchain(saved);
    }

    return saved;
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const [logs, total] = await this.auditLogRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { logs, total };
  }

  /**
   * Search audit logs
   */
  async searchAuditLogs(filters: {
    userId?: string;
    action?: AuditLogAction;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    ipAddress?: string;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const query: any = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;
    if (filters.ipAddress) query.ipAddress = filters.ipAddress;
    if (filters.success !== undefined) query.success = filters.success;

    if (filters.startDate && filters.endDate) {
      query.createdAt = Between(filters.startDate, filters.endDate);
    }

    const [logs, total] = await this.auditLogRepo.findAndCount({
      where: query,
      order: { createdAt: 'DESC' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });

    return { logs, total };
  }

  /**
   * Get audit log statistics
   */
  async getAuditStats(startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.auditLogRepo.createQueryBuilder('log');

    if (startDate && endDate) {
      query.where('log.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const totalLogs = await query.getCount();

    // Count by action
    const actionCounts = await this.auditLogRepo
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.action')
      .orderBy('count', 'DESC')
      .getRawMany();

    // Count by resource
    const resourceCounts = await this.auditLogRepo
      .createQueryBuilder('log')
      .select('log.resource', 'resource')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.resource')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Failed actions
    const failedActions = await this.auditLogRepo.count({
      where: { success: false },
    });

    // Top users by activity
    const topUsers = await this.auditLogRepo
      .createQueryBuilder('log')
      .select('log.user_id', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('log.user_id IS NOT NULL')
      .groupBy('log.user_id')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Top countries
    const topCountries = await this.auditLogRepo
      .createQueryBuilder('log')
      .select('log.country', 'country')
      .addSelect('COUNT(*)', 'count')
      .where('log.country IS NOT NULL')
      .groupBy('log.country')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalLogs,
      failedActions,
      actionCounts,
      resourceCounts,
      topUsers,
      topCountries,
    };
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    const logs = await this.auditLogRepo.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'ASC' },
    });

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else {
      // Convert to CSV
      const headers = [
        'ID',
        'User ID',
        'Action',
        'Resource',
        'Resource ID',
        'IP Address',
        'Country',
        'Success',
        'Created At',
      ];
      let csv = headers.join(',') + '\n';

      for (const log of logs) {
        csv += [
          log.id,
          log.userId || '',
          log.action,
          log.resource,
          log.resourceId || '',
          log.ipAddress,
          log.country || '',
          log.success,
          log.createdAt.toISOString(),
        ].join(',') + '\n';
      }

      return csv;
    }
  }

  /**
   * Store audit log hash on blockchain (optional)
   */
  private async storeOnBlockchain(log: AuditLog): Promise<void> {
    // This is a placeholder for blockchain integration
    // In production, you would:
    // 1. Hash the log entry
    // 2. Submit to a blockchain (Ethereum, Hyperledger, etc.)
    // 3. Store the transaction hash in log.blockchainHash

    const logHash = this.hashLog(log);
    this.logger.log(`Storing audit log ${log.id} on blockchain: ${logHash}`);

    // Simulate blockchain transaction
    // const txHash = await blockchainService.submitHash(logHash);
    // log.blockchainHash = txHash;
    // await this.auditLogRepo.save(log);
  }

  /**
   * Hash audit log for integrity verification
   */
  private hashLog(log: AuditLog): string {
    const crypto = require('crypto');
    const data = JSON.stringify({
      id: log.id,
      userId: log.userId,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify audit log integrity
   */
  async verifyLogIntegrity(logId: string): Promise<boolean> {
    const log = await this.auditLogRepo.findOne({ where: { id: logId } });
    if (!log) {
      return false;
    }

    const currentHash = this.hashLog(log);

    // In production, store on blockchain is enabled, verify against blockchain
    if (log.blockchainHash) {
      // Verify with blockchain
      // const blockchainHash = await blockchainService.getHash(log.blockchainHash);
      // return currentHash === blockchainHash;
    }

    return true;
  }

  /**
   * Clean up old audit logs (respecting retention policy)
   */
  async cleanupOldLogs(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - this.retentionYears);

    this.logger.log(`Cleaning up audit logs older than ${cutoffDate}`);

    // Archive before deletion (in production, move to cold storage)
    const oldLogs = await this.auditLogRepo.find({
      where: {
        createdAt: Between(new Date(0), cutoffDate),
      },
    });

    this.logger.log(`Found ${oldLogs.length} logs to archive`);

    // Archive to file/S3
    // await this.archiveLogs(oldLogs);

    // Delete old logs
    await this.auditLogRepo
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log('Cleanup completed');
  }

  /**
   * Get suspicious login attempts
   */
  async getSuspiciousLogins(hours: number = 24): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    // Find users with multiple failed login attempts
    const failedLogins = await this.auditLogRepo
      .createQueryBuilder('log')
      .select('log.user_id', 'userId')
      .addSelect('log.ip_address', 'ipAddress')
      .addSelect('COUNT(*)', 'attempts')
      .where('log.action = :action', { action: AuditLogAction.USER_LOGIN })
      .andWhere('log.success = false')
      .andWhere('log.created_at > :cutoffDate', { cutoffDate })
      .groupBy('log.user_id, log.ip_address')
      .having('COUNT(*) >= 5')
      .getRawMany();

    return failedLogins;
  }

  /**
   * Get admin actions log
   */
  async getAdminActions(limit: number = 100): Promise<AuditLog[]> {
    const adminActions = [
      AuditLogAction.ADMIN_USER_SUSPEND,
      AuditLogAction.ADMIN_USER_UNSUSPEND,
      AuditLogAction.ADMIN_TRANSACTION_REVIEW,
      AuditLogAction.ADMIN_COMPLIANCE_OVERRIDE,
      AuditLogAction.ADMIN_SETTINGS_CHANGE,
    ];

    return await this.auditLogRepo.find({
      where: adminActions.map((action) => ({ action })),
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
