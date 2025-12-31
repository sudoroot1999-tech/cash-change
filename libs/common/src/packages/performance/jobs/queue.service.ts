import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);

  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();

  private readonly connection: Redis;

  constructor(private readonly configService: ConfigService) {
    this.connection = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_QUEUE_DB', 2),
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });
  }

  /* ---------------- Lifecycle ---------------- */

  async onModuleDestroy() {
    for (const [name, worker] of this.workers) {
      await worker.close();
      this.logger.log(`Worker closed: ${name}`);
    }

    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logger.log(`Queue closed: ${name}`);
    }

    await this.connection.quit();
  }

  /* ---------------- Queue ---------------- */

  getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      });

      this.queues.set(name, queue);
      this.logger.log(`Queue created: ${name}`);
    }

    return this.queues.get(name)!;
  }

  /* ---------------- Producer ---------------- */

  async addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions,
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);

    const job = await queue.add(jobName, data, options);

    this.logger.debug(
      `Job added → queue=${queueName}, name=${jobName}, id=${job.id}`,
    );

    return job;
  }

  async addBulkJobs<T = any>(
    queueName: string,
    jobs: Array<{ name: string; data: T; opts?: JobOptions }>,
  ): Promise<Job<T>[]> {
    const queue = this.getQueue(queueName);

    const added = await queue.addBulk(jobs);

    this.logger.debug(
      `Bulk jobs added → queue=${queueName}, count=${jobs.length}`,
    );

    return added;
  }

  /* ---------------- Consumer ---------------- */

  createWorker<T = any>(
    queueName: string,
    processor: (job: Job<T>) => Promise<any>,
    options?: {
      concurrency?: number;
      limiter?: {
        max: number;
        duration: number;
      };
    },
  ): Worker<T> {
    if (this.workers.has(queueName)) {
      return this.workers.get(queueName)!;
    }

    const worker = new Worker<T>(queueName, processor, {
      connection: this.connection,
      concurrency: options?.concurrency ?? 5,
      limiter: options?.limiter,
    });

    worker.on('completed', (job) => {
      this.logger.debug(`Job completed → queue=${queueName}, id=${job.id}`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(
        `Job failed → queue=${queueName}, id=${job?.id}`,
        err?.stack,
      );
    });

    worker.on('error', (err) => {
      this.logger.error(`Worker error → queue=${queueName}`, err.stack);
    });

    this.workers.set(queueName, worker);
    this.logger.log(`Worker created: ${queueName}`);

    return worker;
  }

  /* ---------------- Scheduling ---------------- */

  async scheduleRecurringJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    cron: string,
    options?: JobOptions,
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);

    const job = await queue.add(jobName, data, {
      ...options,
      repeat: { pattern: cron },
    });

    this.logger.log(
      `Recurring job scheduled → queue=${queueName}, name=${jobName}, cron=${cron}`,
    );

    return job;
  }

  /* ---------------- Management ---------------- */

  async getJob(queueName: string, jobId: string) {
    return this.getQueue(queueName).getJob(jobId);
  }

  async removeJob(queueName: string, jobId: string) {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.remove();
      this.logger.debug(`Job removed → queue=${queueName}, id=${jobId}`);
    }
  }

async getQueueStats(queueName: string) {
  const queue = this.getQueue(queueName);

  const [
    waiting,
    active,
    completed,
    failed,
    delayed,
    isPaused,
  ] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.isPaused(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused: isPaused,
    total: waiting + active + delayed,
  };
}

  async pauseQueue(queueName: string) {
    await this.getQueue(queueName).pause();
    this.logger.log(`Queue paused: ${queueName}`);
  }

  async resumeQueue(queueName: string) {
    await this.getQueue(queueName).resume();
    this.logger.log(`Queue resumed: ${queueName}`);
  }

  async cleanQueue(
    queueName: string,
    graceMs = 60 * 60 * 1000,
    status: 'completed' | 'failed' = 'completed',
  ) {
    const jobs = await this.getQueue(queueName).clean(
      graceMs,
      1000,
      status,
    );

    this.logger.log(
      `Queue cleaned → queue=${queueName}, status=${status}, count=${jobs.length}`,
    );

    return jobs;
  }

  async drainQueue(queueName: string) {
    await this.getQueue(queueName).drain();
    this.logger.log(`Queue drained: ${queueName}`);
  }
}


/**
 * Common queue names
 */
export enum QueueNames {
  EMAIL = 'email',
  NOTIFICATION = 'notification',
  ANALYTICS = 'analytics',
  TRADE_PROCESSING = 'trade-processing',
  WALLET_SYNC = 'wallet-sync',
  REPORT_GENERATION = 'report-generation',
  DATA_EXPORT = 'data-export',
  CACHE_WARMING = 'cache-warming',
}
