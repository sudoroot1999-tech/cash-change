/**
 * @packages/messaging
 * Shared messaging module for microservices communication
 * 
 * Supports:
 * - RabbitMQ for commands and request-response patterns
 * - Kafka for event streaming and analytics
 * - Type-safe event definitions
 * - Automatic retry logic
 * - Dead letter queue handling
 * - Circuit breaker pattern
 * - Comprehensive logging
 */

// RabbitMQ
export * from './rabbitmq/rabbitmq.module';
export * from './rabbitmq/rabbitmq.service';
export * from './rabbitmq/rabbitmq.decorator';
export * from './rabbitmq/interfaces/rabbitmq-config.interface';
export * from './rabbitmq/interfaces/rabbitmq-options.interface';

// Kafka
export * from './kafka/kafka.module';
export * from './kafka/kafka.service';
export * from './kafka/kafka.decorator';
export * from './kafka/interfaces/kafka-config.interface';
export * from './kafka/interfaces/kafka-options.interface';

// Events
export * from './events';

// Constants
export * from './constants/exchanges';
export * from './constants/queues';
export * from './constants/topics';
export * from './constants/routing-keys';

// Utilities
export * from './utils/retry.util';
export * from './utils/logger.util';
