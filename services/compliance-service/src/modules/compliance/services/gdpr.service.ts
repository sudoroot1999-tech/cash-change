import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { GDPRRequest, GDPRRequestType, GDPRRequestStatus } from '../entities/gdpr-request.entity';
import { AuditLog, AuditLogAction } from '../entities/audit-log.entity';

@Injectable()
export class GDPRService {
  private readonly logger = new Logger(GDPRService.name);
  private readonly dataRetentionDays: number;

  constructor(
    @InjectRepository(GDPRRequest)
    private gdprRequestRepo: Repository<GDPRRequest>,
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
    private configService: ConfigService,
  ) {
    this.dataRetentionDays = this.configService.get('GDPR_DATA_RETENTION_DAYS', 2555); // ~7 years
  }

  /**
   * Create a GDPR request
   */
  async createGDPRRequest(
    userId: string,
    type: GDPRRequestType,
    reason?: string,
    details?: Record<string, any>,
  ): Promise<GDPRRequest> {
    this.logger.log(`Creating GDPR request for user ${userId}, type: ${type}`);

    const request = this.gdprRequestRepo.create({
      userId,
      type,
      reason,
      details,
      status: GDPRRequestStatus.PENDING,
    });

    await this.gdprRequestRepo.save(request);

    // Log the request
    await this.logDataAccess(userId, type === GDPRRequestType.DATA_EXPORT ? 'data_export_request' : 'data_delete_request');

    return request;
  }

  /**
   * Export user data (Right to Data Portability)
   */
  async exportUserData(userId: string): Promise<GDPRRequest> {
    this.logger.log(`Exporting data for user ${userId}`);

    // Check if there's a pending request
    let request = await this.gdprRequestRepo.findOne({
      where: {
        userId,
        type: GDPRRequestType.DATA_EXPORT,
        status: GDPRRequestStatus.PENDING,
      },
    });

    if (!request) {
      request = await this.createGDPRRequest(userId, GDPRRequestType.DATA_EXPORT);
    }

    // Update status
    request.status = GDPRRequestStatus.IN_PROGRESS;
    await this.gdprRequestRepo.save(request);

    try {
      // Collect user data from all services
      const userData = await this.collectUserData(userId);

      // Generate export file (JSON)
      const exportData = {
        exportDate: new Date().toISOString(),
        userId,
        data: userData,
      };

      // In production, save to S3 or similar storage
      const exportFilename = `user_data_${userId}_${Date.now()}.json`;
      const exportPath = path.join('/tmp', exportFilename);
      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

      // Generate pre-signed URL (placeholder)
      const exportUrl = `https://exports.example.com/${exportFilename}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      request.status = GDPRRequestStatus.COMPLETED;
      request.exportUrl = exportUrl;
      request.exportExpiresAt = expiresAt;
      request.completedAt = new Date();

      await this.gdprRequestRepo.save(request);

      // Log data access
      await this.logDataAccess(userId, 'data_export');

      return request;
    } catch (error:any) {
      this.logger.error(`Data export failed: ${error.message}`);
      request.status = GDPRRequestStatus.REJECTED;
      request.notes = `Export failed: ${error.message}`;
      await this.gdprRequestRepo.save(request);
      throw error;
    }
  }

  /**
   * Collect user data from all services
   */
  private async collectUserData(userId: string): Promise<any> {
    const userData: any = {};

    // User service
    try {
      const userServiceUrl = this.configService.get('USER_SERVICE_URL');
      const userResponse = await axios.get(`${userServiceUrl}/api/v1/users/${userId}`);
      userData.profile = userResponse.data;
    } catch (error:any) {
      this.logger.warn(`Failed to fetch user data: ${error.message}`);
    }

    // KYC data
    try {
      const kycServiceUrl = this.configService.get('KYC_SERVICE_URL');
      const kycResponse = await axios.get(`${kycServiceUrl}/api/v1/kyc/${userId}`);
      userData.kyc = kycResponse.data;
    } catch (error:any) {
      this.logger.warn(`Failed to fetch KYC data: ${error.message}`);
    }

    // Wallet data
    try {
      const walletServiceUrl = this.configService.get('WALLET_SERVICE_URL');
      const walletResponse = await axios.get(`${walletServiceUrl}/api/v1/wallets/user/${userId}`);
      userData.wallets = walletResponse.data;
    } catch (error:any) {
      this.logger.warn(`Failed to fetch wallet data: ${error.message}`);
    }

    // Trading history
    try {
      const tradingServiceUrl = this.configService.get('TRADING_SERVICE_URL');
      const tradingResponse = await axios.get(`${tradingServiceUrl}/api/v1/trades/history/${userId}`);
      userData.trades = tradingResponse.data;
    } catch (error:any) {
      this.logger.warn(`Failed to fetch trading data: ${error.message}`);
    }

    // Audit logs
    const auditLogs = await this.auditLogRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 1000,
    });
    userData.auditLogs = auditLogs;

    return userData;
  }

  /**
   * Delete user account (Right to be Forgotten)
   */
  async deleteUserAccount(userId: string, processedBy?: string): Promise<GDPRRequest> {
    this.logger.log(`Deleting account for user ${userId}`);

    let request = await this.gdprRequestRepo.findOne({
      where: {
        userId,
        type: GDPRRequestType.DATA_DELETE,
        status: GDPRRequestStatus.PENDING,
      },
    });

    if (!request) {
      request = await this.createGDPRRequest(userId, GDPRRequestType.DATA_DELETE);
    }

    request.status = GDPRRequestStatus.IN_PROGRESS;
    if (processedBy) {
      request.processedBy = processedBy;
    }
    await this.gdprRequestRepo.save(request);

    try {
      // Anonymize user data instead of hard delete (for legal/audit purposes)
      await this.anonymizeUserData(userId);

      request.status = GDPRRequestStatus.COMPLETED;
      request.completedAt = new Date();
      request.processedAt = new Date();
      await this.gdprRequestRepo.save(request);

      // Log deletion
      await this.logDataAccess(userId, 'data_delete');

      return request;
    } catch (error:any) {
      this.logger.error(`Account deletion failed: ${error.message}`);
      request.status = GDPRRequestStatus.REJECTED;
      request.notes = `Deletion failed: ${error.message}`;
      await this.gdprRequestRepo.save(request);
      throw error;
    }
  }

  /**
   * Anonymize user data (GDPR compliant deletion)
   */
  private async anonymizeUserData(userId: string): Promise<void> {
    // Call user service to anonymize
    try {
      const userServiceUrl = this.configService.get('USER_SERVICE_URL');
      await axios.post(`${userServiceUrl}/api/v1/users/${userId}/anonymize`);
    } catch (error:any) {
      this.logger.error(`Failed to anonymize user data: ${error.message}`);
    }

    // Anonymize KYC data
    try {
      const kycServiceUrl = this.configService.get('KYC_SERVICE_URL');
      await axios.post(`${kycServiceUrl}/api/v1/kyc/${userId}/anonymize`);
    } catch (error: any) {
      this.logger.error(`Failed to anonymize KYC data: ${error.message}`);
    }

    // Note: Financial records and audit logs are retained for legal compliance
    // but personal identifiers are removed
  }

  /**
   * Process data rectification request
   */
  async rectifyData(
    userId: string,
    data: Record<string, any>,
    processedBy?: string,
  ): Promise<GDPRRequest> {
    const request = this.gdprRequestRepo.create({
      userId,
      type: GDPRRequestType.DATA_RECTIFICATION,
      details: data,
      status: GDPRRequestStatus.COMPLETED,
      processedBy,
      completedAt: new Date(),
    });

    return await this.gdprRequestRepo.save(request);
  }

  /**
   * Get GDPR requests for a user
   */
  async getUserGDPRRequests(userId: string): Promise<GDPRRequest[]> {
    return await this.gdprRequestRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get pending GDPR requests (for admin dashboard)
   */
  async getPendingRequests(): Promise<GDPRRequest[]> {
    return await this.gdprRequestRepo.find({
      where: { status: GDPRRequestStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Log data access for audit trail
   */
  private async logDataAccess(userId: string, action: string): Promise<void> {
    const auditLog = this.auditLogRepo.create({
      userId,
      action: action as AuditLogAction,
      resource: 'gdpr',
      ipAddress: '127.0.0.1', // Should be passed from request
      success: true,
    });

    await this.auditLogRepo.save(auditLog);
  }

  /**
   * Check data retention compliance
   */
  async checkDataRetention(): Promise<any> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.dataRetentionDays);

    // Find old audit logs
    const oldLogs = await this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.created_at < :cutoffDate', { cutoffDate })
      .getCount();

    return {
      retentionDays: this.dataRetentionDays,
      cutoffDate,
      oldLogsCount: oldLogs,
    };
  }

  /**
   * Clean up old data (scheduled job)
   */
  async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.dataRetentionDays);

    this.logger.log(`Cleaning up data older than ${cutoffDate}`);

    // Archive old audit logs
    await this.auditLogRepo
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .execute();

    // Clean up completed GDPR requests older than 90 days
    const requestCutoffDate = new Date();
    requestCutoffDate.setDate(requestCutoffDate.getDate() - 90);

    await this.gdprRequestRepo
      .createQueryBuilder()
      .delete()
      .where('status = :status', { status: GDPRRequestStatus.COMPLETED })
      .andWhere('completed_at < :cutoffDate', { cutoffDate: requestCutoffDate })
      .execute();
  }

  /**
   * Generate privacy policy acceptance
   */
  async trackPrivacyConsent(
    userId: string,
    consentType: string,
    granted: boolean,
  ): Promise<void> {
    const auditLog = this.auditLogRepo.create({
      userId,
      action: AuditLogAction.DATA_ACCESS,
      resource: 'privacy_consent',
      details: { consentType, granted },
      ipAddress: '127.0.0.1',
      success: true,
    });

    await this.auditLogRepo.save(auditLog);
  }
}
