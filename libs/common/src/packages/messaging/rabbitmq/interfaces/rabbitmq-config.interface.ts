/**
 * RabbitMQ configuration interface
 */
export interface RabbitMQConfig {
  /**
   * RabbitMQ connection URL
   * Format: amqp://username:password@hostname:port/vhost
   */
  url: string;

  /**
   * Reconnect timeout in seconds
   * @default 5
   */
  reconnectTimeInSeconds?: number;

  /**
   * Prefetch count for consumers
   * @default 10
   */
  prefetch?: number;

  /**
   * Enable JSON parsing
   * @default true
   */
  json?: boolean;

  /**
   * Connection name for identification
   */
  connectionName?: string;

  /**
   * Custom logger instance
   */
  logger?: any;
}
