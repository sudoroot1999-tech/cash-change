/**
 * Enhanced logging utility for messaging package
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  [key: string]: any;
}

export interface LoggerOptions {
  /**
   * Minimum log level
   * @default LogLevel.INFO
   */
  level?: LogLevel;

  /**
   * Service name for identification
   */
  serviceName?: string;

  /**
   * Enable timestamp
   * @default true
   */
  timestamp?: boolean;

  /**
   * Enable JSON format
   * @default false
   */
  json?: boolean;

  /**
   * Enable colors
   * @default true
   */
  colors?: boolean;

  /**
   * Custom log handler
   */
  handler?: (level: LogLevel, message: string, context?: LogContext) => void;
}

/**
 * Messaging Logger
 */
export class MessagingLogger {
  private options: Required<LoggerOptions>;

  constructor(options?: LoggerOptions) {
    this.options = {
      level: options?.level ?? LogLevel.INFO,
      serviceName: options?.serviceName || 'messaging',
      timestamp: options?.timestamp !== false,
      json: options?.json || false,
      colors: options?.colors !== false,
      handler: options?.handler || this.defaultHandler.bind(this),
    };
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error | string, context?: LogContext): void {
    const errorContext = error instanceof Error
      ? { error: error.message, stack: error.stack, ...context }
      : { error, ...context };
    this.log(LogLevel.ERROR, message, errorContext);
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (level < this.options.level) {
      return;
    }

    this.options.handler(level, message, context);
  }

  private defaultHandler(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = this.options.timestamp ? new Date().toISOString() : '';
    const levelStr = LogLevel[level];
    const serviceName = this.options.serviceName;

    if (this.options.json) {
      const logObject = {
        timestamp,
        level: levelStr,
        service: serviceName,
        message,
        ...context,
      };
      console.log(JSON.stringify(logObject));
    } else {
      const color = this.getColor(level);
      const reset = '\x1b[0m';
      const prefix = this.options.colors
        ? `${color}[${levelStr}]${reset}`
        : `[${levelStr}]`;

      let logMessage = `${timestamp} ${prefix} [${serviceName}] ${message}`;

      if (context && Object.keys(context).length > 0) {
        logMessage += ` ${JSON.stringify(context)}`;
      }

      // Use appropriate console method
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(logMessage);
          break;
        case LogLevel.INFO:
          console.info(logMessage);
          break;
        case LogLevel.WARN:
          console.warn(logMessage);
          break;
        case LogLevel.ERROR:
          console.error(logMessage);
          break;
      }
    }
  }

  private getColor(level: LogLevel): string {
    if (!this.options.colors) {
      return '';
    }

    switch (level) {
      case LogLevel.DEBUG:
        return '\x1b[36m'; // Cyan
      case LogLevel.INFO:
        return '\x1b[32m'; // Green
      case LogLevel.WARN:
        return '\x1b[33m'; // Yellow
      case LogLevel.ERROR:
        return '\x1b[31m'; // Red
      default:
        return '\x1b[0m'; // Reset
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(options?: LoggerOptions): MessagingLogger {
  return new MessagingLogger(options);
}

/**
 * Default logger instance
 */
export const defaultLogger = new MessagingLogger();
