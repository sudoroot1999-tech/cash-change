import { SetMetadata } from '@nestjs/common';

/**
 * Metadata keys for RabbitMQ decorators
 */
export const RABBITMQ_HANDLER = 'rabbitmq:handler';
export const RABBITMQ_QUEUE = 'rabbitmq:queue';
export const RABBITMQ_EXCHANGE = 'rabbitmq:exchange';
export const RABBITMQ_ROUTING_KEY = 'rabbitmq:routing_key';

/**
 * Decorator to mark a method as a RabbitMQ message handler
 * @param queue Queue name to subscribe to
 * @param options Handler options
 */
export const RabbitMQHandler = (queue: string, options?: { exclusive?: boolean; priority?: number }) =>
  SetMetadata(RABBITMQ_HANDLER, { queue, ...options });

/**
 * Decorator to specify the queue for a handler
 * @param queue Queue name
 */
export const Queue = (queue: string) =>
  SetMetadata(RABBITMQ_QUEUE, queue);

/**
 * Decorator to specify the exchange for a handler
 * @param exchange Exchange name
 */
export const Exchange = (exchange: string) =>
  SetMetadata(RABBITMQ_EXCHANGE, exchange);

/**
 * Decorator to specify the routing key for a handler
 * @param routingKey Routing key pattern
 */
export const RoutingKey = (routingKey: string) =>
  SetMetadata(RABBITMQ_ROUTING_KEY, routingKey);

/**
 * Example usage:
 * 
 * @RabbitMQHandler(QUEUES.USER_REGISTERED)
 * async handleUserRegistered(message: UserRegisteredEvent) {
 *   // Handle message
 * }
 * 
 * @Queue(QUEUES.USER_REGISTERED)
 * @Exchange(EXCHANGES.USER_EVENTS)
 * @RoutingKey(ROUTING_KEYS.USER_REGISTERED)
 * async handleUserRegistered(message: UserRegisteredEvent) {
 *   // Handle message
 * }
 */
