import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycAuditLog } from '../entities/kyc-audit-log.entity';

export interface AuditLogData {
  userId: string;
  verificationRequestId?: string;
  action: string;
  performedBy: string;
  performedByRole: string;
  ipAddress: string;
  userAgent?: string;
  changes?: any;
  reason?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(KycAuditLog)
    private auditLogRepository: Repository<KycAuditLog>,
  ) { }

  /**
   * Creates an audit log entry
   */
  async log(data: AuditLogData): Promise<KycAuditLog> {
    const auditLog = this.auditLogRepository.create({
      userId: data.userId,
      verificationRequestId: data.verificationRequestId,
      action: data.action,
      performedBy: data.performedBy,
      performedByRole: data.performedByRole,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      changes: data.changes,
      reason: data.reason,
    });

    return await this.auditLogRepository.save(auditLog);
  }

  /**
   * Logs document upload
   */
  async logDocumentUpload(
    userId: string,
    verificationRequestId: string,
    documentType: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      verificationRequestId,
      action: 'DOCUMENT_UPLOAD',
      performedBy: userId,
      performedByRole: 'USER',
      ipAddress,
      userAgent,
      changes: { documentType },
    });
  }

  /**
   * Logs KYC submission
   */
  async logKycSubmission(
    userId: string,
    verificationRequestId: string,
    requestedLevel: number,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      verificationRequestId,
      action: 'KYC_SUBMISSION',
      performedBy: userId,
      performedByRole: 'USER',
      ipAddress,
      userAgent,
      changes: { requestedLevel },
    });
  }

  /**
   * Logs KYC review
   */
  async logKycReview(
    userId: string,
    verificationRequestId: string,
    reviewerId: string,
    oldStatus: string,
    newStatus: string,
    reason: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      verificationRequestId,
      action: 'KYC_REVIEW',
      performedBy: reviewerId,
      performedByRole: 'ADMIN',
      ipAddress,
      userAgent,
      changes: {
        oldStatus,
        newStatus,
      },
      reason,
    });
  }

  /**
   * Logs KYC approval
   */
  async logKycApproval(
    userId: string,
    verificationRequestId: string,
    reviewerId: string,
    approvedLevel: number,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      verificationRequestId,
      action: 'KYC_APPROVAL',
      performedBy: reviewerId,
      performedByRole: 'ADMIN',
      ipAddress,
      userAgent,
      changes: { approvedLevel },
    });
  }

  /**
   * Logs KYC rejection
   */
  async logKycRejection(
    userId: string,
    verificationRequestId: string,
    reviewerId: string,
    reason: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      verificationRequestId,
      action: 'KYC_REJECTION',
      performedBy: reviewerId,
      performedByRole: 'ADMIN',
      ipAddress,
      userAgent,
      reason,
    });
  }

  /**
   * Logs document access
   */
  async logDocumentAccess(
    userId: string,
    verificationRequestId: string,
    accessedBy: string,
    role: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      userId,
      verificationRequestId,
      action: 'DOCUMENT_ACCESS',
      performedBy: accessedBy,
      performedByRole: role,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Gets audit logs for a user
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 100,
  ): Promise<KycAuditLog[]> {
    return await this.auditLogRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  /**
   * Gets audit logs for a verification request
   */
  async getVerificationAuditLogs(
    verificationRequestId: string,
  ): Promise<KycAuditLog[]> {
    return await this.auditLogRepository.find({
      where: { verificationRequestId },
      order: { timestamp: 'DESC' },
    });
  }

  /**
   * Gets all audit logs with filters
   */
  async getAuditLogs(
    filters: {
      userId?: string;
      verificationRequestId?: string;
      action?: string;
      performedBy?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ logs: KycAuditLog[]; total: number }> {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (filters.userId) {
      query.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters.verificationRequestId) {
      query.andWhere('audit.verificationRequestId = :verificationRequestId', {
        verificationRequestId: filters.verificationRequestId,
      });
    }

    if (filters.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.performedBy) {
      query.andWhere('audit.performedBy = :performedBy', {
        performedBy: filters.performedBy,
      });
    }

    if (filters.startDate) {
      query.andWhere('audit.timestamp >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query.andWhere('audit.timestamp <= :endDate', {
        endDate: filters.endDate,
      });
    }

    const [logs, total] = await query
      .orderBy('audit.timestamp', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { logs, total };
  }
}
