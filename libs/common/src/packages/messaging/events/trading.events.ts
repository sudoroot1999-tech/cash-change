import { BaseEvent } from './base.event';

/**
 * Order side type
 */
export type OrderSide = 'buy' | 'sell';

/**
 * Order type
 */
export type OrderType = 'market' | 'limit' | 'stop-loss' | 'stop-limit';

/**
 * Order status
 */
export type OrderStatus = 'pending' | 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected' | 'expired';

/**
 * Time in force
 */
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'GTD';

/**
 * Order created event
 */
export interface OrderCreatedEvent extends BaseEvent {
  orderId: string;
  userId: string;
  pair: string;
  side: OrderSide;
  type: OrderType;
  price?: string;
  stopPrice?: string;
  quantity: string;
  timeInForce?: TimeInForce;
  clientOrderId?: string;
}

/**
 * Order placed event (sent to matching engine)
 */
export interface OrderPlacedEvent extends BaseEvent {
  orderId: string;
  userId: string;
  pair: string;
  side: OrderSide;
  type: OrderType;
  price?: string;
  stopPrice?: string;
  quantity: string;
  timeInForce?: TimeInForce;
}

/**
 * Order cancelled event
 */
export interface OrderCancelledEvent extends BaseEvent {
  orderId: string;
  userId: string;
  pair: string;
  reason: string;
  cancelledBy?: string;
}

/**
 * Order matched event
 */
export interface OrderMatchedEvent extends BaseEvent {
  orderId: string;
  userId: string;
  pair: string;
  filledQuantity: string;
  remainingQuantity: string;
  averagePrice: string;
  status: OrderStatus;
}

/**
 * Order partially filled event
 */
export interface OrderPartiallyFilledEvent extends BaseEvent {
  orderId: string;
  userId: string;
  pair: string;
  filledQuantity: string;
  remainingQuantity: string;
  fillPrice: string;
  tradeId: string;
}

/**
 * Order filled event
 */
export interface OrderFilledEvent extends BaseEvent {
  orderId: string;
  userId: string;
  pair: string;
  totalQuantity: string;
  averagePrice: string;
  totalValue: string;
  fee: string;
  filledAt: Date;
}

/**
 * Order rejected event
 */
export interface OrderRejectedEvent extends BaseEvent {
  orderId: string;
  userId: string;
  pair: string;
  reason: string;
  rejectedAt: Date;
}

/**
 * Trade executed event
 */
export interface TradeExecutedEvent extends BaseEvent {
  tradeId: string;
  buyOrderId: string;
  sellOrderId: string;
  buyUserId: string;
  sellUserId: string;
  pair: string;
  price: string;
  quantity: string;
  buyerFee: string;
  sellerFee: string;
  executedAt: Date;
  isMaker: {
    buy: boolean;
    sell: boolean;
  };
}

/**
 * Order book updated event
 */
export interface OrderBookUpdatedEvent extends BaseEvent {
  pair: string;
  bids: Array<[string, string]>; // [price, quantity]
  asks: Array<[string, string]>; // [price, quantity]
  lastUpdateId: number;
}

/**
 * Order book snapshot event
 */
export interface OrderBookSnapshotEvent extends BaseEvent {
  pair: string;
  bids: Array<[string, string]>;
  asks: Array<[string, string]>;
  snapshotId: number;
}

/**
 * Market price updated event
 */
export interface MarketPriceUpdatedEvent extends BaseEvent {
  pair: string;
  price: string;
  priceChange24h: string;
  volume24h: string;
  high24h: string;
  low24h: string;
}

/**
 * Stop order triggered event
 */
export interface StopOrderTriggeredEvent extends BaseEvent {
  orderId: string;
  userId: string;
  pair: string;
  stopPrice: string;
  currentPrice: string;
  triggeredAt: Date;
}
