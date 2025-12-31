import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_BLOCKED = 'LOGIN_BLOCKED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_DELETED = 'API_KEY_DELETED',
  WITHDRAWAL_INITIATED = 'WITHDRAWAL_INITIATED',
  WITHDRAWAL_APPROVED = 'WITHDRAWAL_APPROVED',
  WITHDRAWAL_REJECTED = 'WITHDRAWAL_REJECTED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  CSRF_DETECTED = 'CSRF_DETECTED',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  KYC_SUBMITTED = 'KYC_SUBMITTED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  LARGE_TRANSACTION = 'LARGE_TRANSACTION',
  UNUSUAL_PATTERN = 'UNUSUAL_PATTERN',
  IP_BLACKLISTED = 'IP_BLACKLISTED',
  DEVICE_CHANGED = 'DEVICE_CHANGED',
}

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: Date;
}

@Injectable()
export class SecurityLoggerService implements LoggerService {
  private logger: winston.Logger;
  private securityLogger: winston.Logger;

  constructor() {
    // General application logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: 'crypto-exchange' },
      transports: [
        new winston.transports.File({
          filename: path.join('logs', 'error.log'),
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: path.join('logs', 'combined.log'),
          maxsize: 10485760,
          maxFiles: 10,
        }),
      ],
    });

    // Security-specific logger (immutable audit trail)
    this.securityLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      defaultMeta: { type: 'security-audit' },
      transports: [
        new winston.transports.File({
          filename: path.join('logs', 'security-audit.log'),
          maxsize: 52428800, // 50MB
          maxFiles: 50, // Keep more security logs
        }),
      ],
    });

    // Console output in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      );
    }
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  /**
   * Log security event (immutable audit trail)
   */
  logSecurityEvent(event: SecurityEvent): void {
    const logEntry = {
      ...event,
      timestamp: event.timestamp || new Date(),
      severity: event.severity || this.determineSeverity(event.type),
    };

    this.securityLogger.info('Security Event', logEntry);

    // Also log to general logger for high/critical events
    if (logEntry.severity === 'high' || logEntry.severity === 'critical') {
      this.logger.warn(`Security Event: ${event.type}`, logEntry);
    }
  }

  /**
   * Log authentication event
   */
  logAuth(
    type: SecurityEventType,
    userId: string | undefined,
    ip: string,
    success: boolean,
    metadata?: Record<string, any>,
  ): void {
    this.logSecurityEvent({
      type,
      userId,
      ip,
      metadata: {
        ...metadata,
        success,
      },
      severity: success ? 'low' : 'medium',
    });
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(
    description: string,
    userId: string | undefined,
    ip: string,
    metadata?: Record<string, any>,
  ): void {
    this.logSecurityEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      userId,
      ip,
      metadata: {
        ...metadata,
        description,
      },
      severity: 'high',
    });
  }

  /**
   * Log withdrawal event
   */
  logWithdrawal(
    type: SecurityEventType,
    userId: string,
    amount: string,
    currency: string,
    address: string,
    metadata?: Record<string, any>,
  ): void {
    this.logSecurityEvent({
      type,
      userId,
      metadata: {
        ...metadata,
        amount,
        currency,
        address,
      },
      severity: 'high',
    });
  }

  /**
   * Log rate limit event
   */
  logRateLimit(
    identifier: string,
    endpoint: string,
    ip: string,
    metadata?: Record<string, any>,
  ): void {
    this.logSecurityEvent({
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      ip,
      metadata: {
        ...metadata,
        identifier,
        endpoint,
      },
      severity: 'medium',
    });
  }

  /**
   * Log attack attempt
   */
  logAttackAttempt(
    attackType: SecurityEventType,
    ip: string,
    endpoint: string,
    metadata?: Record<string, any>,
  ): void {
    this.logSecurityEvent({
      type: attackType,
      ip,
      metadata: {
        ...metadata,
        endpoint,
      },
      severity: 'critical',
    });
  }

  /**
   * Determine severity based on event type
   */
  private determineSeverity(type: SecurityEventType): 'low' | 'medium' | 'high' | 'critical' {
    const criticalEvents = [
      SecurityEventType.SQL_INJECTION_ATTEMPT,
      SecurityEventType.XSS_ATTEMPT,
      SecurityEventType.CSRF_DETECTED,
    ];

    const highEvents = [
      SecurityEventType.WITHDRAWAL_INITIATED,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventType.UNAUTHORIZED_ACCESS,
      SecurityEventType.ACCOUNT_LOCKED,
      SecurityEventType.LARGE_TRANSACTION,
      SecurityEventType.IP_BLACKLISTED,
    ];

    const mediumEvents = [
      SecurityEventType.LOGIN_FAILED,
      SecurityEventType.LOGIN_BLOCKED,
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      SecurityEventType.INVALID_TOKEN,
      SecurityEventType.DEVICE_CHANGED,
    ];

    if (criticalEvents.includes(type)) return 'critical';
    if (highEvents.includes(type)) return 'high';
    if (mediumEvents.includes(type)) return 'medium';
    return 'low';
  }

  /**
   * Query security logs (for audit purposes)
   */
  async querySecurityLogs(filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    eventType?: SecurityEventType;
    severity?: string;
  }): Promise<any[]> {
    // In production, this would query from a database or log aggregation service
    // For now, this is a placeholder
    return [];
  }
}
