import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

// Predefined rate limit decorators
export const RateLimitStrict = () =>
  RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
  });

export const RateLimitModerate = () =>
  RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  });

export const RateLimitRelaxed = () =>
  RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  });

export const RateLimitAuth = () =>
  RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
    keyPrefix: 'auth',
  });

export const RateLimitWithdrawal = () =>
  RateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours
    keyPrefix: 'withdrawal',
  });

export const RateLimitAPI = () =>
  RateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyPrefix: 'api',
  });
