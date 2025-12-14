import { HTTP_STATUS } from '../constants';

/**
 * Base application error
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, details);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', HTTP_STATUS.UNAUTHORIZED);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', HTTP_STATUS.FORBIDDEN);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', HTTP_STATUS.NOT_FOUND);
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', HTTP_STATUS.CONFLICT);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Too many requests', 'RATE_LIMIT_EXCEEDED', HTTP_STATUS.TOO_MANY_REQUESTS, { retryAfter });
  }
}

/**
 * Insufficient funds error
 */
export class InsufficientFundsError extends AppError {
  constructor(asset: string) {
    super(`Insufficient ${asset} balance`, 'INSUFFICIENT_FUNDS', HTTP_STATUS.BAD_REQUEST, { asset });
  }
}

/**
 * Order error
 */
export class OrderError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ORDER_ERROR', HTTP_STATUS.BAD_REQUEST, details);
  }
}

/**
 * Withdrawal error
 */
export class WithdrawalError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'WITHDRAWAL_ERROR', HTTP_STATUS.BAD_REQUEST, details);
  }
}

/**
 * KYC required error
 */
export class KycRequiredError extends AppError {
  constructor(requiredLevel: number) {
    super(`KYC level ${requiredLevel} required`, 'KYC_REQUIRED', HTTP_STATUS.FORBIDDEN, { requiredLevel });
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(`${service} is temporarily unavailable`, 'SERVICE_UNAVAILABLE', HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
}
