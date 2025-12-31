/**
 * Custom Error Classes for the Crypto Exchange Platform
 * All custom errors extend the base AppError class
 */

/**
 * Base Error Class
 * All custom errors should extend this class
 */
export abstract class  AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      error: {
        code: this.name,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}

/**
 * 400 Bad Request Error
 * Used when the client sends invalid data
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details?: Record<string, unknown>) {
    super(message, 400, true, details);
    this.name = 'BadRequestError';
  }
}

/**
 * 401 Unauthorized Error
 * Used when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, 401, true, details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden Error
 * Used when user is authenticated but doesn't have permission
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super(message, 403, true, details);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found Error
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: Record<string, unknown>) {
    super(message, 404, true, details);
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict Error
 * Used when there's a conflict with the current state
 */
export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: Record<string, unknown>) {
    super(message, 409, true, details);
    this.name = 'ConflictError';
  }
}

/**
 * 422 Unprocessable Entity Error
 * Used when the request is well-formed but contains semantic errors
 */
export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable Entity', details?: Record<string, unknown>) {
    super(message, 422, true, details);
    this.name = 'UnprocessableEntityError';
  }
}

/**
 * 429 Too Many Requests Error
 * Used when rate limit is exceeded
 */
export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', details?: Record<string, unknown>) {
    super(message, 429, true, details);
    this.name = 'TooManyRequestsError';
  }
}

/**
 * 500 Internal Server Error
 * Used for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: Record<string, unknown>) {
    super(message, 500, false, details);
    this.name = 'InternalServerError';
  }
}

/**
 * 503 Service Unavailable Error
 * Used when a required service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', details?: Record<string, unknown>) {
    super(message, 503, true, details);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Validation Error
 * Used when input validation fails
 */
export class ValidationError extends BadRequestError {
  constructor(message: string, validationErrors?: Record<string, string[]>) {
    super(message, { validationErrors });
    this.name = 'ValidationError';
  }
}

/**
 * Database Error
 * Used for database-related errors
 */
export class DatabaseError extends InternalServerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'DatabaseError';
  }
}

/**
 * External Service Error
 * Used when an external service call fails
 */
export class ExternalServiceError extends ServiceUnavailableError {
  constructor(serviceName: string, details?: Record<string, unknown>) {
    super(`External service ${serviceName} is unavailable`, details);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Insufficient Balance Error
 * Used for wallet operations when balance is insufficient
 */
export class InsufficientBalanceError extends BadRequestError {
  constructor(available: number, required: number, currency: string) {
    super('Insufficient balance for this operation', {
      available,
      required,
      currency,
    });
    this.name = 'InsufficientBalanceError';
  }
}

/**
 * Invalid Order Error
 * Used for trading operations when order is invalid
 */
export class InvalidOrderError extends BadRequestError {
  constructor(message: string, orderDetails?: Record<string, unknown>) {
    super(message, orderDetails);
    this.name = 'InvalidOrderError';
  }
}

/**
 * KYC Required Error
 * Used when KYC verification is required
 */
export class KYCRequiredError extends ForbiddenError {
  constructor(message = 'KYC verification required', requiredLevel?: string) {
    super(message, { requiredLevel });
    this.name = 'KYCRequiredError';
  }
}

/**
 * Token Expired Error
 * Used when JWT or other token has expired
 */
export class TokenExpiredError extends UnauthorizedError {
  constructor(message = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

/**
 * Invalid Token Error
 * Used when token is invalid or malformed
 */
export class InvalidTokenError extends UnauthorizedError {
  constructor(message = 'Invalid token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

/**
 * Duplicate Entry Error
 * Used when trying to create a resource that already exists
 */
export class DuplicateEntryError extends ConflictError {
  constructor(resource: string, field: string, value: string) {
    super(`${resource} with ${field} '${value}' already exists`, {
      resource,
      field,
      value,
    });
    this.name = 'DuplicateEntryError';
  }
}

/**
 * File Upload Error
 * Used for file upload failures
 */
export class FileUploadError extends BadRequestError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'FileUploadError';
  }
}

/**
 * Payment Error
 * Used for payment processing failures
 */
export class PaymentError extends BadRequestError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'PaymentError';
  }
}

/**
 * Blockchain Error
 * Used for blockchain-related errors
 */
export class BlockchainError extends ExternalServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('Blockchain', { message, ...details });
    this.name = 'BlockchainError';
  }
}

/**
 * Type guard to check if error is operational
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Error factory for creating errors from codes
 */
export class ErrorFactory {
  static fromCode(code: string, message?: string, details?: Record<string, unknown>): AppError {
    switch (code) {
      case 'BAD_REQUEST':
        return new BadRequestError(message, details);
      case 'UNAUTHORIZED':
        return new UnauthorizedError(message, details);
      case 'FORBIDDEN':
        return new ForbiddenError(message, details);
      case 'NOT_FOUND':
        return new NotFoundError(message, details);
      case 'CONFLICT':
        return new ConflictError(message, details);
      case 'VALIDATION_ERROR':
        return new ValidationError(message || 'Validation failed', details);
      case 'INSUFFICIENT_BALANCE':
        return new InsufficientBalanceError(
          details?.available as number,
          details?.required as number,
          details?.currency as string
        );
      case 'KYC_REQUIRED':
        return new KYCRequiredError(message, details?.requiredLevel as string);
      case 'TOKEN_EXPIRED':
        return new TokenExpiredError(message);
      case 'INVALID_TOKEN':
        return new InvalidTokenError(message);
      default:
        return new InternalServerError(message, details);
    }
  }
}
