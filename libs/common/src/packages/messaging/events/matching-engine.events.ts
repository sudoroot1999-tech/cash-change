import { OrderSide, OrderType } from '../../../types';
import { BaseEvent } from './base.event';


/**
 * Matching engine specific events
 */

/**
 * Order received by matching engine
 */
export interface OrderReceivedEvent extends BaseEvent {
  orderId: string;
  userId: string;
  pair: string;
  side: OrderSide;
  type: OrderType;
  price?: string;
  quantity: string;
  receivedAt: Date;
}

/**
 * Order matched by engine
 */
export interface OrderMatchEvent extends BaseEvent {
  buyOrderId: string;
  sellOrderId: string;
  pair: string;
  price: string;
  quantity: string;
  buyUserId: string;
  sellUserId: string;
  matchedAt: Date;
}

/**
 * Order book state changed
 */
export interface OrderBookStateChangedEvent extends BaseEvent {
  pair: string;
  bidsCount: number;
  asksCount: number;
  topBidPrice?: string;
  topAskPrice?: string;
  spread?: string;
}

/**
 * Matching engine health event
 */
export interface MatchingEngineHealthEvent extends BaseEvent {
  instanceId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  queueDepth: number;
  matchesPerSecond: number;
  latencyMs: number;
}

/**
 * Order book snapshot for recovery
 */
export interface OrderBookSnapshotCreatedEvent extends BaseEvent {
  pair: string;
  snapshotId: string;
  ordersCount: number;
  createdAt: Date;
  storageLocation: string;
}

/**
 * Market maker order event
 */
export interface MarketMakerOrderEvent extends BaseEvent {
  marketMakerId: string;
  orderId: string;
  pair: string;
  side: OrderSide;
  price: string;
  quantity: string;
  isUpdate: boolean;
}

/**
 * Liquidity pool event
 */
export interface LiquidityPoolUpdatedEvent extends BaseEvent {
  pair: string;
  totalBidVolume: string;
  totalAskVolume: string;
  spreadPercentage: number;
  marketMakersCount: number;
}

/**
 * Circuit breaker triggered event
 */
export interface CircuitBreakerTriggeredEvent extends BaseEvent {
  pair: string;
  reason: 'price_deviation' | 'volume_spike' | 'manual';
  previousPrice: string;
  currentPrice: string;
  priceChangePercentage: number;
  pausedUntil?: Date;
}

/**
 * Trading resumed event
 */
export interface TradingResumedEvent extends BaseEvent {
  pair: string;
  resumedBy: string;
  pausedDuration: number; // seconds
}
