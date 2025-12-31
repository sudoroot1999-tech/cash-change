/**
 * Base event interface that all events must extend
 */
export interface BaseEvent {
  eventId: string;
  timestamp: Date;
  version: string;
}

/**
 * Event metadata for tracking and debugging
 */
export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  traceId?: string;
}

/**
 * Extended base event with metadata
 */
export interface BaseEventWithMetadata extends BaseEvent {
  metadata?: EventMetadata;
}
