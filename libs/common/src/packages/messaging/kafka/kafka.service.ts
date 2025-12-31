import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import {
  Kafka,
  Producer,
  Consumer,
  Admin,
  EachMessagePayload,
  EachBatchPayload,
  ProducerRecord,
  ConsumerSubscribeTopic,
  logLevel,
} from 'kafkajs';
import { KafkaConfig, KafkaProducerConfig, KafkaConsumerConfig } from './interfaces/kafka-config.interface';
import { ProduceOptions, KafkaConsumeOptions as ConsumeOptions } from './interfaces/kafka-options.interface';
import { v4 as uuidv4 } from 'uuid';
import { retryWithBackoff } from '../utils/retry.util';

/**
 * Kafka Service
 * Handles all Kafka operations including producing and consuming messages
 */
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private admin: Admin;
  private consumers: Map<string, Consumer> = new Map();
  private readonly logger: Logger;
  private isProducerConnected = false;

  constructor(
    @Inject('KAFKA_CONFIG') private readonly config: KafkaConfig,
  ) {
    this.logger = config.logger || new Logger(KafkaService.name);
    this.initialize();
  }

  /**
   * Initialize Kafka client, producer, and admin
   */
  private initialize(): void {
    try {
      this.kafka = new Kafka({
        clientId: this.config.clientId,
        brokers: this.config.brokers,
        ssl: this.config.ssl,
        sasl: this.config.sasl,
        connectionTimeout: this.config.connectionTimeout || 30000,
        requestTimeout: this.config.requestTimeout || 30000,
        retry: {
          retries: this.config.retry?.retries || 5,
          initialRetryTime: this.config.retry?.initialRetryTime || 300,
          multiplier: this.config.retry?.multiplier || 2,
          maxRetryTime: this.config.retry?.maxRetryTime || 30000,
        },
        logLevel: this.config.logLevel || logLevel.INFO,
      });

      this.producer = this.kafka.producer({
        allowAutoTopicCreation: true,
        transactionTimeout: 60000,
        retry: {
          retries: 5,
          initialRetryTime: 100,
        },
      });

      this.admin = this.kafka.admin();
    } catch (error) {
      this.logger.error('Failed to initialize Kafka', error);
      throw error;
    }
  }

  /**
   * Connect producer on module initialization
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.producer.connect();
      this.isProducerConnected = true;
      this.logger.log('✅ Kafka producer connected');

      // Connect admin client
      await this.admin.connect();
      this.logger.log('✅ Kafka admin connected');
    } catch (error) {
      this.logger.error('Failed to connect Kafka producer', error);
      throw error;
    }
  }

  /**
   * Produce a message to a topic
   * @param topic Topic name
   * @param message Message payload
   * @param key Optional message key for partitioning
   * @param options Produce options
   */
  async produce<T>(
    topic: string,
    message: T,
    key?: string,
    options?: ProduceOptions,
  ): Promise<void> {
    await retryWithBackoff(async () => {
      try {
        const eventId = key || uuidv4();
        const payload = {
          ...message,
          eventId,
          timestamp: new Date().toISOString(),
          version: '1.0',
        };

        const record: ProducerRecord = {
          topic,
          messages: [
            {
              key: options?.key || eventId,
              value: JSON.stringify(payload),
              partition: options?.partition,
              headers: {
                ...options?.headers,
                'event-id': eventId,
                'timestamp': Date.now().toString(),
              },
              timestamp: options?.timestamp,
            },
          ],
          acks: options?.acks,
          timeout: options?.timeout,
          compression: options?.compression,
        };

        await this.producer.send(record);

        this.logger.debug(`Produced message to ${topic}`, {
          eventId,
          key: record.messages[0].key,
        });
      } catch (error) {
        this.logger.error(`Failed to produce message to ${topic}`, error);
        throw error;
      }
    }, 3);
  }

  /**
   * Produce multiple messages to a topic
   * @param topic Topic name
   * @param messages Array of messages
   * @param options Produce options
   */
  async produceBatch<T>(
    topic: string,
    messages: Array<{ key?: string; value: T }>,
    options?: ProduceOptions,
  ): Promise<void> {
    try {
      const kafkaMessages = messages.map(msg => {
        const eventId = msg.key || uuidv4();
        const payload = {
          ...msg.value,
          eventId,
          timestamp: new Date().toISOString(),
          version: '1.0',
        };

        return {
          key: msg.key || eventId,
          value: JSON.stringify(payload),
          headers: {
            ...options?.headers,
            'event-id': eventId,
            'timestamp': Date.now().toString(),
          },
        };
      });

      await this.producer.send({
        topic,
        messages: kafkaMessages,
        acks: options?.acks,
        timeout: options?.timeout,
        compression: options?.compression,
      });

      this.logger.debug(`Produced ${messages.length} messages to ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to produce batch to ${topic}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to a topic
   * @param topic Topic name
   * @param groupId Consumer group ID
   * @param handler Message handler
   * @param options Consume options
   */
  async subscribe<T>(
    topic: string,
    groupId: string,
    handler: (message: T, payload: EachMessagePayload) => Promise<void>,
    options?: ConsumeOptions,
  ): Promise<void> {
    try {
      const consumer = this.kafka.consumer({
        groupId,
        sessionTimeout: options?.sessionTimeout || 30000,
        heartbeatInterval: options?.heartbeatInterval || 3000,
        rebalanceTimeout: options?.rebalanceTimeout || 60000,
        retry: options?.retry,
        maxBytesPerPartition: options?.maxBytesPerPartition,
      });

      await consumer.connect();
      this.logger.log(`Connected consumer for group: ${groupId}`);

      await consumer.subscribe({
        topic,
        fromBeginning: options?.fromBeginning || false,
      });

      await consumer.run({
        autoCommit: options?.autoCommit !== false,
        autoCommitInterval: options?.autoCommitInterval,
        autoCommitThreshold: options?.autoCommitThreshold,
        eachMessage: async (payload: EachMessagePayload) => {
          const startTime = Date.now();
          try {
            const value = payload.message.value?.toString();
            if (!value) {
              this.logger.warn('Received empty message', {
                topic: payload.topic,
                partition: payload.partition,
                offset: payload.message.offset,
              });
              return;
            }

            const message = JSON.parse(value);
            this.logger.debug(`Received message from ${topic}`, {
              partition: payload.partition,
              offset: payload.message.offset,
              eventId: message.eventId,
            });

            await handler(message, payload);

            const processingTime = Date.now() - startTime;
            this.logger.debug(`Message processed in ${processingTime}ms`, {
              topic: payload.topic,
              offset: payload.message.offset,
            });
          } catch (error:any) {
            this.logger.error(`Error processing message from ${topic}`, {
              error: error.message,
              stack: error.stack,
              partition: payload.partition,
              offset: payload.message.offset,
            });
            // Kafka will handle retry via consumer group rebalancing
            // For DLQ, implement custom logic in the handler
          }
        },
      });

      this.consumers.set(groupId, consumer);
      this.logger.log(`✅ Subscribed to ${topic} with group ${groupId}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to ${topic}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to multiple topics
   * @param topics Topic names
   * @param groupId Consumer group ID
   * @param handler Message handler
   * @param options Consume options
   */
  async subscribeToTopics<T>(
    topics: string[],
    groupId: string,
    handler: (message: T, payload: EachMessagePayload) => Promise<void>,
    options?: ConsumeOptions,
  ): Promise<void> {
    try {
      const consumer = this.kafka.consumer({
        groupId,
        sessionTimeout: options?.sessionTimeout || 30000,
        heartbeatInterval: options?.heartbeatInterval || 3000,
      });

      await consumer.connect();

      for (const topic of topics) {
        await consumer.subscribe({
          topic,
          fromBeginning: options?.fromBeginning || false,
        });
      }

      await consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          try {
            const value = payload.message.value?.toString();
            if (!value) return;

            const message = JSON.parse(value);
            await handler(message, payload);
          } catch (error) {
            this.logger.error('Error processing message', error);
          }
        },
      });

      this.consumers.set(groupId, consumer);
      this.logger.log(`✅ Subscribed to topics: ${topics.join(', ')}`);
    } catch (error) {
      this.logger.error('Failed to subscribe to topics', error);
      throw error;
    }
  }

  /**
   * Subscribe with batch processing
   * @param topic Topic name
   * @param groupId Consumer group ID
   * @param handler Batch handler
   * @param options Consume options
   */
  async subscribeBatch<T>(
    topic: string,
    groupId: string,
    handler: (messages: T[], payload: EachBatchPayload) => Promise<void>,
    options?: ConsumeOptions,
  ): Promise<void> {
    try {
      const consumer = this.kafka.consumer({ groupId });
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: options?.fromBeginning || false });

      await consumer.run({
        eachBatch: async (payload: EachBatchPayload) => {
          try {
            const messages = payload.batch.messages
              .map(msg => msg.value?.toString())
              .filter(Boolean)
              .map(value => JSON.parse(value as string));

            await handler(messages, payload);

            this.logger.debug(`Processed batch of ${messages.length} messages from ${topic}`);
          } catch (error) {
            this.logger.error('Error processing batch', error);
          }
        },
      });

      this.consumers.set(groupId, consumer);
      this.logger.log(`✅ Subscribed to ${topic} (batch mode) with group ${groupId}`);
    } catch (error) {
      this.logger.error('Failed to subscribe batch', error);
      throw error;
    }
  }

  /**
   * Create topics
   * @param topics Topic configurations
   */
  async createTopics(topics: Array<{ topic: string; numPartitions?: number; replicationFactor?: number }>): Promise<void> {
    try {
      await this.admin.createTopics({
        topics: topics.map(t => ({
          topic: t.topic,
          numPartitions: t.numPartitions || 3,
          replicationFactor: t.replicationFactor || 1,
        })),
      });
      this.logger.log(`Created topics: ${topics.map(t => t.topic).join(', ')}`);
    } catch (error) {
      this.logger.error('Failed to create topics', error);
      throw error;
    }
  }

  /**
   * List all topics
   */
  async listTopics(): Promise<string[]> {
    try {
      return await this.admin.listTopics();
    } catch (error) {
      this.logger.error('Failed to list topics', error);
      throw error;
    }
  }

  /**
   * Get producer connection status
   */
  isProducerActive(): boolean {
    return this.isProducerConnected;
  }

  /**
   * Disconnect all consumers and producer on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');

      for (const [groupId, consumer] of this.consumers) {
        await consumer.disconnect();
        this.logger.log(`Consumer ${groupId} disconnected`);
      }

      await this.admin.disconnect();
      this.logger.log('Kafka admin disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Kafka', error);
    }
  }
}
