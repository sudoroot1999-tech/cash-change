import { Message } from 'kafkajs';

/**
 * Options for producing messages
 */
export interface ProduceOptions {
  /**
   * Message key for partitioning
   */
  key?: string;

  /**
   * Partition to send to (overrides key-based partitioning)
   */
  partition?: number;

  /**
   * Message headers
   */
  headers?: Record<string, string | Buffer>;

  /**
   * Timestamp
   */
  timestamp?: string;

  /**
   * Compression type
   */
  compression?: 'gzip' | 'snappy' | 'lz4' | 'zstd' | 'none';

  /**
   * Required acks override
   */
  acks?: -1 | 0 | 1;

  /**
   * Timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Options for consuming messages
 */
export interface KafkaConsumeOptions {
  /**
   * Start from beginning
   * @default false
   */
  fromBeginning?: boolean;

  /**
   * Auto-resolve offsets
   * @default true
   */
  autoResolve?: boolean;

  /**
   * Number of concurrent messages to process
   * @default 1
   */
  concurrency?: number;

  /**
   * Partition assignment strategy
   */
  partitionAssigners?: any[];

  /**
   * Session timeout
   */
  sessionTimeout?: number;

  /**
   * Rebalance timeout
   */
  rebalanceTimeout?: number;

  /**
   * Heartbeat interval
   */
  heartbeatInterval?: number;

  /**
   * Max bytes per partition
   */
  maxBytesPerPartition?: number;

  /**
   * Min bytes
   */
  minBytes?: number;

  /**
   * Max bytes
   */
  maxBytes?: number;

  /**
   * Max wait time in milliseconds
   */
  maxWaitTimeInMs?: number;

  /**
   * Retry configuration
   */
  retry?: {
    retries?: number;
    multiplier?: number;
    initialRetryTime?: number;
  };

  /**
   * Auto-commit
   */
  autoCommit?: boolean;

  /**
   * Auto-commit interval
   */
  autoCommitInterval?: number;

  /**
   * Auto-commit threshold
   */
  autoCommitThreshold?: number;

  /**
   * Each batch handler
   */
  eachBatchAutoResolve?: boolean;
}

/**
 * Batch message interface
 */
export interface KafkaBatch {
  topic: string;
  partition: number;
  highWatermark: string;
  messages: KafkaMessage[];
}

/**
 * Kafka message interface
 */
export interface KafkaMessage {
  key: Buffer | null;
  value: Buffer | null;
  timestamp: string;
  size: number;
  attributes: number;
  offset: string;
  headers?: Record<string, Buffer>;
}

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /**
   * Topics to subscribe to
   */
  topics?: string[];

  /**
   * Topic pattern (regex)
   */
  topicPattern?: RegExp;

  /**
   * From beginning
   */
  fromBeginning?: boolean;
}
