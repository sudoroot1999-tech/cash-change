import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';
import { SecurityEventType } from '../../../types';
import { SECURITY_EVENT_TYPES } from '../../../constants';



export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: Date;
}

const SEVERITY_MAP = {
  [SECURITY_EVENT_TYPES.SQL_INJECTION_ATTEMPT]: 'critical',
  [SECURITY_EVENT_TYPES.XSS_ATTEMPT]: 'critical',
  [SECURITY_EVENT_TYPES.CSRF_DETECTED]: 'critical',

  [SECURITY_EVENT_TYPES.WITHDRAWAL_INITIATED]: 'high',
  [SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY]: 'high',
  [SECURITY_EVENT_TYPES.UNAUTHORIZED_ACCESS]: 'high',
  [SECURITY_EVENT_TYPES.ACCOUNT_LOCKED]: 'high',
  [SECURITY_EVENT_TYPES.LARGE_TRANSACTION]: 'high',
  [SECURITY_EVENT_TYPES.IP_BLACKLISTED]: 'high',

  [SECURITY_EVENT_TYPES.LOGIN_FAILED]: 'medium',
  [SECURITY_EVENT_TYPES.LOGIN_BLOCKED]: 'medium',
  [SECURITY_EVENT_TYPES.RATE_LIMIT_EXCEEDED]: 'medium',
  [SECURITY_EVENT_TYPES.INVALID_TOKEN]: 'medium',
  [SECURITY_EVENT_TYPES.DEVICE_CHANGED]: 'medium',
} as const satisfies Partial<Record<SecurityEventType, Severity>>;

type Severity = 'low' | 'medium' | 'high' | 'critical';

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
      type: SECURITY_EVENT_TYPES.SUSPICIOUS_ACTIVITY,
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
      type: SECURITY_EVENT_TYPES.RATE_LIMIT_EXCEEDED,
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
  private determineSeverity(type: SecurityEventType): Severity {
    return SEVERITY_MAP[type] ?? 'low';
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
