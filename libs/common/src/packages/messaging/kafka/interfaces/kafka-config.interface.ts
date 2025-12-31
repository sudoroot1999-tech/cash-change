import { logLevel } from 'kafkajs';

/**
 * Kafka configuration interface
 */
export interface KafkaConfig {
  /**
   * Client ID for identification
   */
  clientId: string;

  /**
   * Kafka broker addresses
   */
  brokers: string[];

  /**
   * SSL configuration
   */
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
    ca?: string[];
    key?: string;
    cert?: string;
  };

  /**
   * SASL authentication
   */
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };

  /**
   * Connection timeout in milliseconds
   * @default 30000
   */
  connectionTimeout?: number;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  requestTimeout?: number;

  /**
   * Retry configuration
   */
  retry?: {
    retries?: number;
    initialRetryTime?: number;
    multiplier?: number;
    maxRetryTime?: number;
  };

  /**
   * Log level
   */
  logLevel?: logLevel;

  /**
   * Custom logger instance
   */
  logger?: any;
}

/**
 * Producer configuration
 */
export interface KafkaProducerConfig {
  /**
   * Allow auto topic creation
   * @default true
   */
  allowAutoTopicCreation?: boolean;

  /**
   * Transaction timeout in milliseconds
   * @default 60000
   */
  transactionTimeout?: number;

  /**
   * Required acks
   * -1 = all replicas, 0 = no acks, 1 = leader only
   * @default -1
   */
  acks?: -1 | 0 | 1;

  /**
   * Compression type
   */
  compression?: 'gzip' | 'snappy' | 'lz4' | 'zstd' | 'none';

  /**
   * Idempotent producer
   * @default false
   */
  idempotent?: boolean;

  /**
   * Max in-flight requests
   * @default 5
   */
  maxInFlightRequests?: number;
}

/**
 * Consumer configuration
 */
export interface KafkaConsumerConfig {
  /**
   * Consumer group ID
   */
  groupId: string;

  /**
   * Session timeout in milliseconds
   * @default 30000
   */
  sessionTimeout?: number;

  /**
   * Heartbeat interval in milliseconds
   * @default 3000
   */
  heartbeatInterval?: number;

  /**
   * Rebalance timeout in milliseconds
   * @default 60000
   */
  rebalanceTimeout?: number;

  /**
   * Allow auto-commit
   * @default true
   */
  autoCommit?: boolean;

  /**
   * Auto-commit interval in milliseconds
   * @default 5000
   */
  autoCommitInterval?: number;

  /**
   * Max bytes per partition
   * @default 1048576 (1MB)
   */
  maxBytesPerPartition?: number;

  /**
   * Retry configuration
   */
  retry?: {
    retries?: number;
    multiplier?: number;
    initialRetryTime?: number;
  };
}
