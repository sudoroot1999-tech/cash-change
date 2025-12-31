import winston from 'winston';

/**
 * Log Levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

/**
 * Log Context Interface
 */
export interface LogContext {
  traceId?: string;
  userId?: string;
  service?: string;
  [key: string]: any;
}

/**
 * Sensitive fields that should be redacted
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'privateKey',
  'creditCard',
  'ssn',
  'pin',
  'authorization',
  'cookie',
];

/**
 * Redact sensitive information from log data
 */
function redactSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }

  const redacted: any = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Custom format for JSON logs
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      service: service || process.env.SERVICE_NAME || 'unknown',
      message,
      ...redactSensitiveData(meta),
    };

    return JSON.stringify(logEntry);
  })
);

/**
 * Custom format for console logs (development)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? `\n${JSON.stringify(redactSensitiveData(meta), null, 2)}`
      : '';
    return `[${timestamp}] [${service || 'app'}] ${level}: ${message}${metaStr}`;
  })
);

/**
 * Create Winston logger instance
 */
function createLogger() {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

  return winston.createLogger({
    level: logLevel,
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4,
    },
    format: isProduction ? jsonFormat : consoleFormat,
    defaultMeta: {
      service: process.env.SERVICE_NAME || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
    },
    transports: [
      // Console transport
      new winston.transports.Console({
        handleExceptions: true,
        handleRejections: true,
      }),

      // Error log file
      ...(isProduction
        ? [
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              maxsize: 10485760, // 10MB
              maxFiles: 5,
            }),

            // Combined log file
            new winston.transports.File({
              filename: 'logs/combined.log',
              maxsize: 10485760, // 10MB
              maxFiles: 5,
            }),
          ]
        : []),
    ],
  });
}

/**
 * Logger instance
 */
export const logger = createLogger();

/**
 * Logger class with utility methods
 */
export class Logger {
  private service: string;
  private context: LogContext;

  constructor(service: string, context: LogContext = {}) {
    this.service = service;
    this.context = context;
  }

  /**
   * Log error message
   */
  error(message: string, meta?: Record<string, any>): void {
    logger.error(message, {
      service: this.service,
      ...this.context,
      ...meta,
    });
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    logger.warn(message, {
      service: this.service,
      ...this.context,
      ...meta,
    });
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, any>): void {
    logger.info(message, {
      service: this.service,
      ...this.context,
      ...meta,
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, any>): void {
    logger.debug(message, {
      service: this.service,
      ...this.context,
      ...meta,
    });
  }

  /**
   * Log trace message
   */
  trace(message: string, meta?: Record<string, any>): void {
    logger.log('trace', message, {
      service: this.service,
      ...this.context,
      ...meta,
    });
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger(this.service, { ...this.context, ...context });
  }

  /**
   * Log HTTP request
   */
  logRequest(req: any): void {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      traceId: req.headers['x-trace-id'],
    });
  }

  /**
   * Log HTTP response
   */
  logResponse(req: any, res: any, responseTime: number): void {
    this.info('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      traceId: req.headers['x-trace-id'],
    });
  }

  /**
   * Log database query
   */
  logQuery(query: string, duration: number, params?: any[]): void {
    this.debug('Database Query', {
      query,
      duration: `${duration}ms`,
      params: params ? redactSensitiveData(params) : undefined,
    });
  }

  /**
   * Log external API call
   */
  logExternalApiCall(
    service: string,
    method: string,
    url: string,
    duration: number,
    statusCode?: number
  ): void {
    this.info('External API Call', {
      externalService: service,
      method,
      url,
      duration: `${duration}ms`,
      statusCode,
    });
  }

  /**
   * Log authentication event
   */
  logAuth(event: string, userId?: string, success: boolean = true): void {
    this.info(`Auth: ${event}`, {
      event,
      userId,
      success,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log authorization failure
   */
  logAuthzFailure(userId: string, resource: string, action: string): void {
    this.warn('Authorization Failed', {
      userId,
      resource,
      action,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: string, meta?: Record<string, any>): void {
    this.warn(`Security: ${event}`, {
      event,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(operation: string, duration: number, meta?: Record<string, any>): void {
    this.info('Performance Metric', {
      operation,
      duration: `${duration}ms`,
      ...meta,
    });
  }

  /**
   * Log business metric
   */
  logBusinessMetric(metric: string, value: number, meta?: Record<string, any>): void {
    this.info('Business Metric', {
      metric,
      value,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Create a new logger instance
 */
export function createServiceLogger(service: string, context?: LogContext): Logger {
  return new Logger(service, context);
}

/**
 * Express middleware for request logging
 */
export function requestLogger(serviceName: string) {
  const log = new Logger(serviceName);

  return (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Add trace ID if not present
    if (!req.headers['x-trace-id']) {
      req.headers['x-trace-id'] = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}`;
    }

    // Log request
    log.logRequest(req);

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      log.logResponse(req, res, duration);
    });

    next();
  };
}
