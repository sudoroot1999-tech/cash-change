import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

export class CacheService {
  private ttl: number;

  constructor(ttl: number = 300) {
    this.ttl = ttl; // Default 5 minutes
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.debug(`Cache hit: ${key}`);
        return JSON.parse(cached) as T;
      }
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache get error', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const expiry = ttl || this.ttl;
      await redisClient.setex(key, expiry, JSON.stringify(value));
      logger.debug(`Cache set: ${key} (TTL: ${expiry}s)`);
    } catch (error) {
      logger.error('Cache set error', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await redisClient.del(key);
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.error('Cache delete error', error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.debug(`Cache deleted pattern: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      logger.error('Cache delete pattern error', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', error);
      return false;
    }
  }

  async getTTL(key: string): Promise<number> {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      logger.error('Cache getTTL error', error);
      return -1;
    }
  }

  async invalidateAll(): Promise<void> {
    try {
      await redisClient.flushdb();
      logger.info('All cache invalidated');
    } catch (error) {
      logger.error('Cache invalidate all error', error);
    }
  }
}
