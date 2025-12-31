/**
 * Options for publishing messages
 */
export interface PublishOptions {
  /**
   * Message persistence
   * @default true
   */
  persistent?: boolean;

  /**
   * Message priority (0-10)
   */
  priority?: number;

  /**
   * Message expiration in milliseconds
   */
  expiration?: number;

  /**
   * Message headers
   */
  headers?: Record<string, any>;

  /**
   * Correlation ID for request-response patterns
   */
  correlationId?: string;

  /**
   * Reply-to queue for request-response patterns
   */
  replyTo?: string;

  /**
   * Message type identifier
   */
  type?: string;

  /**
   * Content type
   * @default 'application/json'
   */
  contentType?: string;
}

/**
 * Options for consuming messages
 */
export interface RabbitMQConsumeOptions {
  /**
   * No acknowledgement mode
   * @default false
   */
  noAck?: boolean;

  /**
   * Exclusive consumer
   * @default false
   */
  exclusive?: boolean;

  /**
   * Consumer priority
   */
  priority?: number;

  /**
   * Consumer tag
   */
  consumerTag?: string;

  /**
   * Arguments for consumer
   */
  arguments?: Record<string, any>;
}

/**
 * Options for queue assertion
 */
export interface QueueOptions {
  /**
   * Durable queue (survives broker restart)
   * @default true
   */
  durable?: boolean;

  /**
   * Exclusive queue (deleted when connection closes)
   * @default false
   */
  exclusive?: boolean;

  /**
   * Auto-delete queue (deleted when last consumer unsubscribes)
   * @default false
   */
  autoDelete?: boolean;

  /**
   * Message TTL in milliseconds
   */
  messageTtl?: number;

  /**
   * Dead letter exchange
   */
  deadLetterExchange?: string;

  /**
   * Dead letter routing key
   */
  deadLetterRoutingKey?: string;

  /**
   * Max queue length
   */
  maxLength?: number;

  /**
   * Max priority
   */
  maxPriority?: number;

  /**
   * Additional arguments
   */
  arguments?: Record<string, any>;
}
