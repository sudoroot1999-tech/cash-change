import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface AnomalyConfig {
  withdrawalThreshold: number;
  loginAttemptsThreshold: number;
  apiCallsThreshold: number;
  unusualLocationEnabled: boolean;
  unusualTimeEnabled: boolean;
}

export interface UserBehavior {
  userId: string;
  averageWithdrawalAmount: number;
  averageLoginTime: number;
  commonLocations: string[];
  commonDevices: string[];
  averageApiCalls: number;
}

@Injectable()
export class AnomalyDetectorService {
  private readonly logger = new Logger(AnomalyDetectorService.name);
  private redis: Redis;
  private config: AnomalyConfig;

  constructor(private configService: ConfigService, config?: Partial<AnomalyConfig>) {
    this.redis = new Redis(configService.get('REDIS_URL'));
    this.config = {
      withdrawalThreshold: config?.withdrawalThreshold || 3,
      loginAttemptsThreshold: config?.loginAttemptsThreshold || 5,
      apiCallsThreshold: config?.apiCallsThreshold || 5,
      unusualLocationEnabled: config?.unusualLocationEnabled ?? true,
      unusualTimeEnabled: config?.unusualTimeEnabled ?? true,
    };
  }

  /**
   * Detect unusual withdrawal pattern
   */
  async detectUnusualWithdrawal(
    userId: string,
    amount: number,
    currency: string,
  ): Promise<{ isAnomalous: boolean; reason?: string; score: number }> {
    try {
      const key = `user_behavior:${userId}:withdrawals`;
      const withdrawals = await this.redis.lrange(key, 0, 99);

      if (withdrawals.length < 5) {
        // Not enough data
        return { isAnomalous: false, score: 0 };
      }

      const amounts = withdrawals.map((w) => JSON.parse(w).amount);
      const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const stdDev = Math.sqrt(
        amounts.reduce((sq, n) => sq + Math.pow(n - average, 2), 0) / amounts.length,
      );

      const zScore = Math.abs((amount - average) / stdDev);

      if (zScore > this.config.withdrawalThreshold) {
        this.logger.warn(
          `Unusual withdrawal detected for user ${userId}: ${amount} ${currency} (z-score: ${zScore})`,
        );
        return {
          isAnomalous: true,
          reason: `Withdrawal amount significantly higher than average (${zScore.toFixed(2)}x standard deviation)`,
          score: zScore,
        };
      }

      return { isAnomalous: false, score: zScore };
    } catch (error: any) {
      this.logger.error(`Error detecting withdrawal anomaly: ${error.message}`);
      return { isAnomalous: false, score: 0 };
    }
  }

  /**
   * Detect unusual login pattern
   */
  async detectUnusualLogin(
    userId: string,
    ip: string,
    userAgent: string,
    timestamp: Date = new Date(),
  ): Promise<{ isAnomalous: boolean; reasons: string[]; score: number }> {
    const reasons: string[] = [];
    let score = 0;

    try {
      // Check location
      if (this.config.unusualLocationEnabled) {
        const locationScore = await this.checkUnusualLocation(userId, ip);
        if (locationScore > 0.7) {
          reasons.push('Login from unusual location');
          score += locationScore;
        }
      }

      // Check time
      if (this.config.unusualTimeEnabled) {
        const timeScore = await this.checkUnusualTime(userId, timestamp);
        if (timeScore > 0.7) {
          reasons.push('Login at unusual time');
          score += timeScore;
        }
      }

      // Check device
      const deviceScore = await this.checkUnusualDevice(userId, userAgent);
      if (deviceScore > 0.7) {
        reasons.push('Login from new or unusual device');
        score += deviceScore;
      }

      // Check rapid location changes
      const rapidChangeScore = await this.checkRapidLocationChange(userId, ip);
      if (rapidChangeScore > 0.8) {
        reasons.push('Impossible travel detected');
        score += rapidChangeScore * 2; // Weight this higher
      }

      const isAnomalous = score > 1.5;

      if (isAnomalous) {
        this.logger.warn(
          `Unusual login detected for user ${userId} from ${ip}: ${reasons.join(', ')}`,
        );
      }

      return { isAnomalous, reasons, score };
    } catch (error: any) {
      this.logger.error(`Error detecting login anomaly: ${error.message}`);
      return { isAnomalous: false, reasons: [], score: 0 };
    }
  }

  /**
   * Detect API abuse
   */
  async detectAPIAbuse(
    identifier: string,
    endpoint: string,
  ): Promise<{ isAbuse: boolean; reason?: string }> {
    try {
      const key = `api_calls:${identifier}:${endpoint}`;
      const count = await this.redis.incr(key);

      if (count === 1) {
        await this.redis.expire(key, 60); // 1 minute window
      }

      const behavior = await this.getUserBehavior(identifier);
      const threshold = behavior.averageApiCalls * this.config.apiCallsThreshold;

      if (count > threshold) {
        this.logger.warn(`API abuse detected for ${identifier} on ${endpoint}`);
        return {
          isAbuse: true,
          reason: `Excessive API calls: ${count} in 1 minute (threshold: ${threshold})`,
        };
      }

      return { isAbuse: false };
    } catch (error: any) {
      this.logger.error(`Error detecting API abuse: ${error.message}`);
      return { isAbuse: false };
    }
  }

  /**
   * Track user behavior
   */
  async trackBehavior(
    userId: string,
    action: 'withdrawal' | 'login' | 'api_call',
    data: any,
  ): Promise<void> {
    try {
      const key = `user_behavior:${userId}:${action}s`;
      const entry = JSON.stringify({ ...data, timestamp: Date.now() });

      await this.redis.lpush(key, entry);
      await this.redis.ltrim(key, 0, 99); // Keep last 100 entries
      await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days
    } catch (error: any) {
      this.logger.error(`Error tracking behavior: ${error.message}`);
    }
  }

  /**
   * Check unusual location
   */
  private async checkUnusualLocation(userId: string, ip: string): Promise<number> {
    const key = `user_behavior:${userId}:locations`;
    const locations = await this.redis.smembers(key);

    if (locations.length === 0) {
      await this.redis.sadd(key, ip);
      await this.redis.expire(key, 90 * 24 * 60 * 60); // 90 days
      return 0;
    }

    if (!locations.includes(ip)) {
      await this.redis.sadd(key, ip);
      return 0.8; // New location
    }

    return 0;
  }

  /**
   * Check unusual time
   */
  private async checkUnusualTime(userId: string, timestamp: Date): Promise<number> {
    const key = `user_behavior:${userId}:login_times`;
    const hour = timestamp.getHours();

    const times = await this.redis.lrange(key, 0, 99);
    if (times.length < 10) {
      await this.redis.lpush(key, hour.toString());
      await this.redis.ltrim(key, 0, 99);
      return 0;
    }

    const hours = times.map((t) => parseInt(t, 10));
    const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;
    const deviation = Math.abs(hour - avgHour);

    await this.redis.lpush(key, hour.toString());
    await this.redis.ltrim(key, 0, 99);

    return deviation > 6 ? 0.7 : 0;
  }

  /**
   * Check unusual device
   */
  private async checkUnusualDevice(userId: string, userAgent: string): Promise<number> {
    const key = `user_behavior:${userId}:devices`;
    const devices = await this.redis.smembers(key);

    if (devices.length === 0) {
      await this.redis.sadd(key, userAgent);
      await this.redis.expire(key, 90 * 24 * 60 * 60);
      return 0;
    }

    if (!devices.includes(userAgent)) {
      await this.redis.sadd(key, userAgent);
      return 0.6; // New device
    }

    return 0;
  }

  /**
   * Check rapid location change (impossible travel)
   */
  private async checkRapidLocationChange(userId: string, ip: string): Promise<number> {
    const key = `user_behavior:${userId}:last_login`;
    const lastLogin = await this.redis.get(key);

    if (!lastLogin) {
      await this.redis.set(key, JSON.stringify({ ip, timestamp: Date.now() }), 'EX', 3600);
      return 0;
    }

    const { ip: lastIp, timestamp: lastTimestamp } = JSON.parse(lastLogin);
    const timeDiff = Date.now() - lastTimestamp;

    await this.redis.set(key, JSON.stringify({ ip, timestamp: Date.now() }), 'EX', 3600);

    // If different IP and less than 1 hour
    if (ip !== lastIp && timeDiff < 3600000) {
      return 0.9; // Suspicious
    }

    return 0;
  }

  /**
   * Get user behavior profile
   */
  private async getUserBehavior(userId: string): Promise<UserBehavior> {
    try {
      const withdrawals = await this.redis.lrange(`user_behavior:${userId}:withdrawals`, 0, 99);
      const logins = await this.redis.lrange(`user_behavior:${userId}:logins`, 0, 99);
      const apiCalls = await this.redis.lrange(`user_behavior:${userId}:api_calls`, 0, 99);

      const averageWithdrawalAmount =
        withdrawals.length > 0
          ? withdrawals.reduce((sum, w) => sum + JSON.parse(w).amount, 0) / withdrawals.length
          : 0;

      const averageLoginTime =
        logins.length > 0
          ? logins.reduce((sum, l) => sum + new Date(JSON.parse(l).timestamp).getHours(), 0) /
          logins.length
          : 12;

      const commonLocations = await this.redis.smembers(`user_behavior:${userId}:locations`);
      const commonDevices = await this.redis.smembers(`user_behavior:${userId}:devices`);

      const averageApiCalls = apiCalls.length > 0 ? apiCalls.length / 30 : 100;

      return {
        userId,
        averageWithdrawalAmount,
        averageLoginTime,
        commonLocations,
        commonDevices,
        averageApiCalls,
      };
    } catch (error: any) {
      this.logger.error(`Error getting user behavior: ${error.message}`);
      return {
        userId,
        averageWithdrawalAmount: 0,
        averageLoginTime: 12,
        commonLocations: [],
        commonDevices: [],
        averageApiCalls: 100,
      };
    }
  }
}
