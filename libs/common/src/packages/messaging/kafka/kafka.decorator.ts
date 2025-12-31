import { SetMetadata } from '@nestjs/common';

/**
 * Metadata keys for Kafka decorators
 */
export const KAFKA_HANDLER = 'kafka:handler';
export const KAFKA_TOPIC = 'kafka:topic';
export const KAFKA_GROUP_ID = 'kafka:group_id';
export const KAFKA_FROM_BEGINNING = 'kafka:from_beginning';

/**
 * Decorator to mark a method as a Kafka message handler
 * @param topic Topic name to subscribe to
 * @param groupId Consumer group ID
 * @param options Handler options
 */
export const KafkaHandler = (
  topic: string,
  groupId: string,
  options?: { fromBeginning?: boolean },
) =>
  SetMetadata(KAFKA_HANDLER, { topic, groupId, ...options });

/**
 * Decorator to specify the topic for a handler
 * @param topic Topic name
 */
export const Topic = (topic: string) =>
  SetMetadata(KAFKA_TOPIC, topic);

/**
 * Decorator to specify the group ID for a handler
 * @param groupId Consumer group ID
 */
export const GroupId = (groupId: string) =>
  SetMetadata(KAFKA_GROUP_ID, groupId);

/**
 * Decorator to specify reading from beginning
 * @param fromBeginning Read from beginning flag
 */
export const FromBeginning = (fromBeginning: boolean = true) =>
  SetMetadata(KAFKA_FROM_BEGINNING, fromBeginning);

/**
 * Example usage:
 * 
 * @KafkaHandler(KAFKA_TOPICS.USER_EVENTS, 'notification-service')
 * async handleUserEvents(message: UserRegisteredEvent) {
 *   // Handle message
 * }
 * 
 * @Topic(KAFKA_TOPICS.TRADING_EVENTS)
 * @GroupId('analytics-service')
 * @FromBeginning(true)
 * async handleTradingEvents(message: TradeExecutedEvent) {
 *   // Handle message
 * }
 */
