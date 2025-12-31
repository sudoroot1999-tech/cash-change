import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { RabbitMQConfig } from './interfaces/rabbitmq-config.interface';
import { PublishOptions, RabbitMQConsumeOptions as ConsumeOptions, QueueOptions } from './interfaces/rabbitmq-options.interface';
import { EXCHANGES, QUEUES } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { retryWithBackoff } from '../utils/retry.util';

/**
 * RabbitMQ Service
 * Handles all RabbitMQ operations including publishing and consuming messages
 */
@Injectable()
export class RabbitMQService implements OnModuleDestroy {
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private readonly logger: Logger;
  private isConnected = false;

  constructor(
    @Inject('RABBITMQ_CONFIG') private readonly config: RabbitMQConfig,
  ) {
    this.logger = config.logger || new Logger(RabbitMQService.name);
    this.connect();
  }

  /**
   * Establish connection to RabbitMQ
   */
  private async connect(): Promise<void> {
    try {
      this.connection = amqp.connect([this.config.url], {
        reconnectTimeInSeconds: this.config.reconnectTimeInSeconds || 5,
        heartbeatIntervalInSeconds: 30,
        connectionOptions: {
          clientProperties: {
            connection_name: this.config.connectionName || 'messaging-package',
          },
        },
      });

      this.connection.on('connect', () => {
        this.isConnected = true;
        this.logger.log('✅ Connected to RabbitMQ');
      });

      this.connection.on('disconnect', (params) => {
        this.isConnected = false;
        this.logger.warn('⚠️  Disconnected from RabbitMQ', params.err?.message);
      });

      this.connection.on('connectFailed', (error) => {
        this.logger.error('❌ Failed to connect to RabbitMQ', error.err?.message);
      });

      this.channelWrapper = this.connection.createChannel({
        json: this.config.json !== false,
        setup: async (channel: ConfirmChannel) => {
          await channel.prefetch(this.config.prefetch || 10);
          await this.setupInfrastructure(channel);
        },
      });

      this.channelWrapper.on('error', (err) => {
        this.logger.error('Channel error:', err);
      });

      this.channelWrapper.on('close', () => {
        this.logger.warn('Channel closed');
      });
    } catch (error) {
      this.logger.error('Failed to initialize RabbitMQ', error);
      throw error;
    }
  }

  /**
   * Setup exchanges, queues, and bindings
   */
  private async setupInfrastructure(channel: ConfirmChannel): Promise<void> {
    try {
      // Setup all exchanges
      const exchanges = Object.values(EXCHANGES);
      for (const exchange of exchanges) {
        await channel.assertExchange(exchange, 'topic', { durable: true });
        this.logger.debug(`Exchange asserted: ${exchange}`);
      }

      // Setup all queues with default options
      const queues = Object.values(QUEUES);
      for (const queue of queues) {
        await channel.assertQueue(queue, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': EXCHANGES.DLX,
            'x-message-ttl': 86400000, // 24 hours
            'x-max-priority': 10,
          },
        });
        this.logger.debug(`Queue asserted: ${queue}`);
      }

      // Setup Dead Letter Queue
      await channel.assertQueue(QUEUES.DLX_QUEUE, { durable: true });
      await channel.bindQueue(QUEUES.DLX_QUEUE, EXCHANGES.DLX, '#');
      this.logger.log('✅ RabbitMQ infrastructure setup completed');
    } catch (error) {
      this.logger.error('Failed to setup RabbitMQ infrastructure', error);
      throw error;
    }
  }

  /**
   * Publish a message to an exchange
   * @param exchange Exchange name
   * @param routingKey Routing key
   * @param message Message payload
   * @param options Publish options
   */
  async publish<T>(
    exchange: string,
    routingKey: string,
    message: T,
    options?: PublishOptions,
  ): Promise<void> {
    await retryWithBackoff(async () => {
      try {
        const eventId = uuidv4();
        const payload = {
          ...message,
          eventId,
          timestamp: new Date(),
          version: '1.0',
        };

        await this.channelWrapper.publish(
          exchange,
          routingKey,
          payload,
          {
            persistent: options?.persistent !== false,
            contentType: options?.contentType || 'application/json',
            priority: options?.priority,
            expiration: options?.expiration,
            headers: {
              ...options?.headers,
              'x-event-id': eventId,
            },
            correlationId: options?.correlationId,
            replyTo: options?.replyTo,
            type: options?.type,
          },
        );

        this.logger.debug(`Published to ${exchange}:${routingKey}`, { eventId });
      } catch (error) {
        this.logger.error(`Failed to publish message to ${exchange}:${routingKey}`, error);
        throw error;
      }
    }, 3);
  }

  /**
   * Send a message directly to a queue
   * @param queue Queue name
   * @param message Message payload
   * @param options Publish options
   */
  async sendToQueue<T>(
    queue: string,
    message: T,
    options?: PublishOptions,
  ): Promise<void> {
    await this.publish('', queue, message, options);
  }

  /**
   * Subscribe to a queue
   * @param queue Queue name
   * @param handler Message handler
   * @param options Consume options
   */
  async subscribe<T>(
    queue: string,
    handler: (message: T, rawMessage: ConsumeMessage) => Promise<void>,
    options?: ConsumeOptions,
  ): Promise<void> {
    try {
      await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
        // Ensure queue exists
        await channel.assertQueue(queue, { durable: true });

        await channel.consume(
          queue,
          async (msg: ConsumeMessage | null) => {
            if (!msg) {
              this.logger.warn(`Null message received from ${queue}`);
              return;
            }

            const startTime = Date.now();
            try {
              const content = this.config.json !== false
                ? JSON.parse(msg.content.toString())
                : msg.content.toString();

              this.logger.debug(`Received message from ${queue}`, {
                eventId: content.eventId,
                correlationId: msg.properties.correlationId,
              });

              await handler(content, msg);
              
              channel.ack(msg);
              
              const processingTime = Date.now() - startTime;
              this.logger.debug(`Message processed successfully from ${queue} in ${processingTime}ms`);
            } catch (error:any) {
              this.logger.error(`Error processing message from ${queue}`, {
                error: error.message,
                stack: error.stack,
                messageId: msg.properties.messageId,
              });
              
              // Retry logic
              const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
              const maxRetries = 3;
              
              if (retryCount <= maxRetries) {
                // Requeue with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
                
                setTimeout(() => {
                  channel.nack(msg, false, false);
                  channel.sendToQueue(
                    queue,
                    msg.content,
                    {
                      ...msg.properties,
                      headers: {
                        ...msg.properties.headers,
                        'x-retry-count': retryCount,
                        'x-first-death-queue': queue,
                        'x-first-death-reason': error.message,
                      },
                    },
                  );
                  this.logger.warn(`Retrying message (${retryCount}/${maxRetries}) from ${queue}`);
                }, delay);
              } else {
                // Send to dead letter queue
                channel.nack(msg, false, false);
                this.logger.error(`Message sent to DLQ after ${maxRetries} retries from ${queue}`);
              }
            }
          },
          {
            noAck: options?.noAck || false,
            exclusive: options?.exclusive || false,
            priority: options?.priority,
            consumerTag: options?.consumerTag,
            arguments: options?.arguments,
          },
        );
      });

      this.logger.log(`✅ Subscribed to queue: ${queue}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to ${queue}`, error);
      throw error;
    }
  }

  /**
   * Bind a queue to an exchange with a routing key
   * @param queue Queue name
   * @param exchange Exchange name
   * @param routingKey Routing key pattern
   */
  async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
    try {
      await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
        await channel.assertQueue(queue, { durable: true });
        await channel.assertExchange(exchange, 'topic', { durable: true });
        await channel.bindQueue(queue, exchange, routingKey);
      });
      this.logger.log(`Bound queue ${queue} to ${exchange} with routing key ${routingKey}`);
    } catch (error) {
      this.logger.error(`Failed to bind queue ${queue} to ${exchange}`, error);
      throw error;
    }
  }

  /**
   * Create a queue with custom options
   * @param queue Queue name
   * @param options Queue options
   */
  async createQueue(queue: string, options?: QueueOptions): Promise<void> {
    try {
      await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
        await channel.assertQueue(queue, {
          durable: options?.durable !== false,
          exclusive: options?.exclusive || false,
          autoDelete: options?.autoDelete || false,
          arguments: {
            'x-message-ttl': options?.messageTtl,
            'x-dead-letter-exchange': options?.deadLetterExchange || EXCHANGES.DLX,
            'x-dead-letter-routing-key': options?.deadLetterRoutingKey,
            'x-max-length': options?.maxLength,
            'x-max-priority': options?.maxPriority || 10,
            ...options?.arguments,
          },
        });
      });
      this.logger.log(`Queue created: ${queue}`);
    } catch (error) {
      this.logger.error(`Failed to create queue ${queue}`, error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }

  /**
   * Close connections on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.channelWrapper.close();
      await this.connection.close();
      this.logger.log('RabbitMQ connection closed');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection', error);
    }
  }
}
