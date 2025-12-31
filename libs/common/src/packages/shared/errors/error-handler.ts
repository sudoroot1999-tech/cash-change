import { Request, Response, NextFunction } from 'express';

import { AppError, InternalServerError, isOperationalError, NotFoundError } from './index';

/**
 * Error Response Format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    traceId?: string;
    stack?: string;
  };
}

/**
 * Global Error Handler Middleware
 * Catches all errors and sends appropriate response
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Generate trace ID for error tracking
  const traceId = req.headers['x-trace-id'] as string || generateTraceId();

  // Log the error
  logError(error, req, traceId);

  // Send error response
  if (error instanceof AppError) {
    sendErrorResponse(res, error, traceId);
  } else {
    // Unknown error - treat as internal server error
    const internalError = new InternalServerError(
      'An unexpected error occurred'
    );
    sendErrorResponse(res, internalError, traceId);
  }
}

/**
 * Send formatted error response
 */
function sendErrorResponse(
  res: Response,
  error: AppError,
  traceId: string
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const errorResponse: ErrorResponse = {
    error: {
      code: error.name,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp,
      traceId,
      // Only include stack trace in development
      ...(isDevelopment && { stack: error.stack }),
    },
  };

  res.status(error.statusCode).json(errorResponse);
}

/**
 * Log error with context
 */
function logError(error: Error, req: Request, traceId: string): void {
  const logger = getLogger();
  
  const errorContext = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    traceId,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id,
    userAgent: req.headers['user-agent'],
  };

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error('Server error occurred', errorContext);
    } else if (error.statusCode >= 400) {
      logger.warn('Client error occurred', errorContext);
    }
  } else {
    logger.error('Unexpected error occurred', errorContext);
  }
}

/**
 * Generate unique trace ID
 */
function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get logger instance
 * Replace with your actual logger
 */
function getLogger() {
  // This is a placeholder - replace with your actual logger
  return {
    error: (message: string, context: Record<string, unknown>) => {
      console.error(message, context);
    },
    warn: (message: string, context: Record<string, unknown>) => {
      console.warn(message, context);
    },
    info: (message: string, context: Record<string, unknown>) => {
      console.info(message, context);
    },
  };
}

/**
 * Handle unhandled promise rejections
 */
export function handleUnhandledRejection(reason: Error | any, _promise: Promise<any>): void {
  const logger = getLogger();
  
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });

  // In production, you might want to gracefully shutdown
  if (!isOperationalError(reason)) {
    process.exit(1);
  }
}

/**
 * Handle uncaught exceptions
 */
export function handleUncaughtException(error: Error): void {
  const logger = getLogger();
  
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
  });

  // Always exit on uncaught exception
  process.exit(1);
}

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not Found Handler
 * Handles 404 errors
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const error = new NotFoundError(
    `Route ${req.method} ${req.url} not found`
  );
  next(error);
}

/**
 * Setup global error handlers
 */
export function setupErrorHandlers(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', handleUnhandledRejection);

  // Handle uncaught exceptions
  process.on('uncaughtException', handleUncaughtException);
}
