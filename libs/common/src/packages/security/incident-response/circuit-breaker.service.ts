import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export interface CircuitStatus {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private redis: Redis;
  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    resetTimeout: 30000, // 30 seconds
  };

  constructor(private configService: ConfigService) {
    this.redis = new Redis(configService.get('REDIS_URL'));
  }

  /**
   * Execute function with circuit breaker
   */
  async execute<T>(
    circuitName: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const fullConfig = { ...this.defaultConfig, ...config };
    const status = await this.getStatus(circuitName);

    // Check if circuit is open
    if (status.state === CircuitState.OPEN) {
      const now = Date.now();
      if (status.nextAttemptTime && now < status.nextAttemptTime) {
        throw new Error(`Circuit breaker ${circuitName} is OPEN`);
      }

      // Try to transition to half-open
      await this.transitionToHalfOpen(circuitName);
    }

    try {
      const result = await Promise.race([
        fn(),
        this.timeout(fullConfig.timeout),
      ]);

      await this.recordSuccess(circuitName, fullConfig);
      return result;
    } catch (error) {
      await this.recordFailure(circuitName, fullConfig);
      throw error;
    }
  }

  /**
   * Get circuit status
   */
  async getStatus(circuitName: string): Promise<CircuitStatus> {
    const data = await this.redis.get(`circuit:${circuitName}`);

    if (!data) {
      return {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
      };
    }

    return JSON.parse(data);
  }

  /**
   * Record success
   */
  private async recordSuccess(
    circuitName: string,
    config: CircuitBreakerConfig,
  ): Promise<void> {
    const status = await this.getStatus(circuitName);

    if (status.state === CircuitState.HALF_OPEN) {
      status.successes++;

      if (status.successes >= config.successThreshold) {
        status.state = CircuitState.CLOSED;
        status.failures = 0;
        status.successes = 0;
        status.lastFailureTime = undefined;
        status.nextAttemptTime = undefined;

        this.logger.log(`Circuit breaker ${circuitName} closed`);
      }
    } else if (status.state === CircuitState.CLOSED) {
      // Reset failure count on success
      status.failures = 0;
    }

    await this.redis.set(`circuit:${circuitName}`, JSON.stringify(status));
  }

  /**
   * Record failure
   */
  private async recordFailure(
    circuitName: string,
    config: CircuitBreakerConfig,
  ): Promise<void> {
    const status = await this.getStatus(circuitName);
    const now = Date.now();

    status.failures++;
    status.lastFailureTime = now;

    if (status.state === CircuitState.HALF_OPEN) {
      // Go back to open on any failure in half-open state
      status.state = CircuitState.OPEN;
      status.nextAttemptTime = now + config.resetTimeout;
      status.successes = 0;

      this.logger.warn(`Circuit breaker ${circuitName} reopened`);
    } else if (status.failures >= config.failureThreshold) {
      status.state = CircuitState.OPEN;
      status.nextAttemptTime = now + config.resetTimeout;

      this.logger.error(`Circuit breaker ${circuitName} opened after ${status.failures} failures`);
    }

    await this.redis.set(`circuit:${circuitName}`, JSON.stringify(status));
  }

  /**
   * Transition to half-open state
   */
  private async transitionToHalfOpen(circuitName: string): Promise<void> {
    const status = await this.getStatus(circuitName);
    status.state = CircuitState.HALF_OPEN;
    status.successes = 0;

    await this.redis.set(`circuit:${circuitName}`, JSON.stringify(status));

    this.logger.log(`Circuit breaker ${circuitName} transitioned to HALF_OPEN`);
  }

  /**
   * Manually open circuit
   */
  async openCircuit(circuitName: string, reason: string): Promise<void> {
    const status = await this.getStatus(circuitName);
    status.state = CircuitState.OPEN;
    status.nextAttemptTime = Date.now() + this.defaultConfig.resetTimeout;

    await this.redis.set(`circuit:${circuitName}`, JSON.stringify(status));

    this.logger.warn(`Circuit breaker ${circuitName} manually opened: ${reason}`);
  }

  /**
   * Manually close circuit
   */
  async closeCircuit(circuitName: string): Promise<void> {
    const status: CircuitStatus = {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
    };

    await this.redis.set(`circuit:${circuitName}`, JSON.stringify(status));

    this.logger.log(`Circuit breaker ${circuitName} manually closed`);
  }

  /**
   * Reset circuit
   */
  async resetCircuit(circuitName: string): Promise<void> {
    await this.redis.del(`circuit:${circuitName}`);
    this.logger.log(`Circuit breaker ${circuitName} reset`);
  }

  /**
   * Timeout helper
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), ms);
    });
  }

  /**
   * Get all circuit statuses
   */
  async getAllCircuits(): Promise<Record<string, CircuitStatus>> {
    const keys = await this.redis.keys('circuit:*');
    const circuits: Record<string, CircuitStatus> = {};

    for (const key of keys) {
      const name = key.replace('circuit:', '');
      circuits[name] = await this.getStatus(name);
    }

    return circuits;
  }
}
