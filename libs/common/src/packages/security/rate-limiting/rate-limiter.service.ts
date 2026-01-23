import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly config: ConfigService;
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis(configService.get('REDIS_URL'), {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });


    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });


    this.redis.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
  }

  /**
   * Check and increment rate limit using sliding window algorithm
   */
  async checkRateLimit(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = `${config.keyPrefix || 'rate_limit'}:${identifier}`;
    const blockKey = `${key}:blocked`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Check if blocked
      const isBlocked = await this.redis.exists(blockKey);
      if (isBlocked) {
        const ttl = await this.redis.pttl(blockKey);
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + ttl,
          retryAfter: ttl,
        };
      }

      // Use sorted set for sliding window
      const multi = this.redis.multi();

      // Remove old entries
      multi.zremrangebyscore(key, 0, windowStart);

      // Count current requests
      multi.zcard(key);

      // Add current request
      multi.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiry
      multi.pexpire(key, config.windowMs);

      const results = await multi.exec();
      const count = results![1][1] as number;

      if (count >= config.maxRequests) {
        // Block if configured
        if (config.blockDurationMs) {
          await this.redis.set(
            blockKey,
            '1',
            'PX',
            config.blockDurationMs,
          );
        }

        return {
          allowed: false,
          remaining: 0,
          resetTime: now + config.windowMs,
          retryAfter: config.blockDurationMs || config.windowMs,
        };
      }

      return {
        allowed: true,
        remaining: config.maxRequests - count - 1,
        resetTime: now + config.windowMs,
      };
    } catch (error: any) {
      this.logger.error(`Rate limit check failed: ${error.message}`);
      // Fail open in case of Redis errors
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }
  }

  /**
   * Token bucket rate limiter
   */
  async checkTokenBucket(
    identifier: string,
    capacity: number,
    refillRate: number,
    cost: number = 1,
  ): Promise<RateLimitResult> {
    const key = `token_bucket:${identifier}`;
    const now = Date.now();

    try {
      const data = await this.redis.get(key);
      let tokens = capacity;
      let lastRefill = now;

      if (data) {
        const parsed = JSON.parse(data);
        const elapsed = now - parsed.lastRefill;
        const refilled = (elapsed / 1000) * refillRate;
        tokens = Math.min(capacity, parsed.tokens + refilled);
        lastRefill = parsed.lastRefill;
      }

      if (tokens >= cost) {
        tokens -= cost;
        await this.redis.set(
          key,
          JSON.stringify({ tokens, lastRefill: now }),
          'EX',
          3600,
        );

        return {
          allowed: true,
          remaining: Math.floor(tokens),
          resetTime: now + ((capacity - tokens) / refillRate) * 1000,
        };
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime: now + ((cost - tokens) / refillRate) * 1000,
        retryAfter: ((cost - tokens) / refillRate) * 1000,
      };
    } catch (error: any) {
      this.logger.error(`Token bucket check failed: ${error.message}`);
      return {
        allowed: true,
        remaining: capacity,
        resetTime: now + 1000,
      };
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async resetRateLimit(identifier: string, keyPrefix?: string): Promise<void> {
    const key = `${keyPrefix || 'rate_limit'}:${identifier}`;
    const blockKey = `${key}:blocked`;

    await this.redis.del(key, blockKey);
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<{ count: number; remaining: number }> {
    const key = `${config.keyPrefix || 'rate_limit'}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      await this.redis.zremrangebyscore(key, 0, windowStart);
      const count = await this.redis.zcard(key);

      return {
        count,
        remaining: Math.max(0, config.maxRequests - count),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get rate limit status: ${error.message}`);
      return {
        count: 0,
        remaining: config.maxRequests,
      };
    }
  }

  /**
   * Block identifier for specific duration
   */
  async blockIdentifier(
    identifier: string,
    durationMs: number,
    reason?: string,
  ): Promise<void> {
    const blockKey = `rate_limit:${identifier}:blocked`;
    const value = reason || 'blocked';

    await this.redis.set(blockKey, value, 'PX', durationMs);
    this.logger.warn(`Blocked ${identifier} for ${durationMs}ms. Reason: ${reason}`);
  }

  /**
   * Check if identifier is blocked
   */
  async isBlocked(identifier: string): Promise<boolean> {
    const blockKey = `rate_limit:${identifier}:blocked`;
    return (await this.redis.exists(blockKey)) === 1;
  }

  /**
   * Unblock identifier
   */
  async unblock(identifier: string): Promise<void> {
    const blockKey = `rate_limit:${identifier}:blocked`;
    await this.redis.del(blockKey);
    this.logger.log(`Unblocked ${identifier}`);
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}
