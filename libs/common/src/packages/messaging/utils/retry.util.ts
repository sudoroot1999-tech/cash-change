/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  /**
   * Maximum number of retries
   * @default 3
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds
   * @default 1000
   */
  initialDelay?: number;

  /**
   * Maximum delay in milliseconds
   * @default 30000
   */
  maxDelay?: number;

  /**
   * Backoff multiplier
   * @default 2
   */
  multiplier?: number;

  /**
   * Jitter to add randomness
   * @default true
   */
  jitter?: boolean;

  /**
   * Function to determine if error is retryable
   */
  retryIf?: (error: Error) => boolean;

  /**
   * Callback on retry
   */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param options Retry options
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  options?: Omit<RetryOptions, 'maxRetries'>,
): Promise<T> {
  const opts: RetryOptions = {
    maxRetries,
    initialDelay: options?.initialDelay || 1000,
    maxDelay: options?.maxDelay || 30000,
    multiplier: options?.multiplier || 2,
    jitter: options?.jitter !== false,
    retryIf: options?.retryIf || (() => true),
    onRetry: options?.onRetry,
  };

  let lastError: Error;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === opts.maxRetries) {
        throw lastError;
      }

      if (opts.retryIf && !opts.retryIf(lastError)) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, opts);
      
      if (opts.onRetry) {
        opts.onRetry(lastError, attempt + 1);
      }

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const exponentialDelay = options.initialDelay! * Math.pow(options.multiplier!, attempt);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay!);
  
  if (options.jitter) {
    // Add random jitter between 0-25% of delay
    const jitter = cappedDelay * 0.25 * Math.random();
    return cappedDelay + jitter;
  }
  
  return cappedDelay;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with linear backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param delay Delay between retries in milliseconds
 */
export async function retryWithLinearBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      await sleep(delay * (attempt + 1));
    }
  }
  
  throw lastError!;
}

/**
 * Retry with fixed delay
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param delay Fixed delay in milliseconds
 */
export async function retryWithFixedDelay<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Circuit breaker state
 */
enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  /**
   * Failure threshold before opening circuit
   * @default 5
   */
  failureThreshold?: number;

  /**
   * Success threshold to close circuit from half-open
   * @default 2
   */
  successThreshold?: number;

  /**
   * Timeout in milliseconds before attempting half-open
   * @default 60000
   */
  timeout?: number;

  /**
   * Callback when circuit opens
   */
  onOpen?: () => void;

  /**
   * Callback when circuit closes
   */
  onClose?: () => void;

  /**
   * Callback when circuit half-opens
   */
  onHalfOpen?: () => void;
}

/**
 * Circuit breaker for fault tolerance
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();
  private options: Required<CircuitBreakerOptions>;

  constructor(options?: CircuitBreakerOptions) {
    this.options = {
      failureThreshold: options?.failureThreshold || 5,
      successThreshold: options?.successThreshold || 2,
      timeout: options?.timeout || 60000,
      onOpen: options?.onOpen || (() => {}),
      onClose: options?.onClose || (() => {}),
      onHalfOpen: options?.onHalfOpen || (() => {}),
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = CircuitBreakerState.HALF_OPEN;
      this.options.onHalfOpen();
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
        this.options.onClose();
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (
      this.state === CircuitBreakerState.HALF_OPEN ||
      this.failureCount >= this.options.failureThreshold
    ) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttempt = Date.now() + this.options.timeout;
      this.options.onOpen();
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }
}
