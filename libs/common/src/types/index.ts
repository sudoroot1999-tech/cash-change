import {
  USER_STATUS,
  USER_TIERS,
  ORDER_TYPES,
  ORDER_SIDES,
  ORDER_STATUS,
  TIME_IN_FORCE,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  NOTIFICATION_CHANNELS,
} from '../constants';

// Extract types from constants
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
export type UserTier = (typeof USER_TIERS)[keyof typeof USER_TIERS];
export type OrderType = (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];
export type OrderSide = (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES];
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type TimeInForce = (typeof TIME_IN_FORCE)[keyof typeof TIME_IN_FORCE];
export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];
export type TransactionStatus = (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];

// User Types
export interface User {
  id: string;
  email: string;
  phone?: string;
  status: UserStatus;
  tier: UserTier;
  kycLevel: number;
  referralCode: string;
  referredBy?: string;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  country?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  avatarUrl?: string;
  bio?: string;
  preferences: Record<string, unknown>;
}

// Auth Types
export interface TokenPayload {
  sub: string;
  email: string;
  tier: UserTier;
  kycLevel: number;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Wallet Types
export interface Asset {
  id: string;
  symbol: string;
  name: string;
  network: string;
  contractAddress?: string;
  decimals: number;
  isActive: boolean;
  minDeposit: string;
  minWithdrawal: string;
  withdrawalFee: string;
}

export interface Wallet {
  id: string;
  userId: string;
  assetId: string;
  address?: string;
  availableBalance: string;
  lockedBalance: string;
}

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: TransactionType;
  amount: string;
  fee: string;
  status: TransactionStatus;
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
  confirmations: number;
  requiredConfirmations: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Trading Types
export interface TradingPair {
  id: string;
  baseAssetId: string;
  quoteAssetId: string;
  symbol: string;
  status: 'active' | 'suspended' | 'delisted';
  minOrderSize: string;
  maxOrderSize: string;
  pricePrecision: number;
  quantityPrecision: number;
  makerFee: string;
  takerFee: string;
}

export interface Order {
  id: string;
  userId: string;
  pairId: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  price?: string;
  quantity: string;
  filledQuantity: string;
  remainingQuantity: string;
  stopPrice?: string;
  timeInForce: TimeInForce;
  clientOrderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Trade {
  id: string;
  pairId: string;
  buyerOrderId: string;
  sellerOrderId: string;
  buyerId: string;
  sellerId: string;
  price: string;
  quantity: string;
  buyerFee: string;
  sellerFee: string;
  isBuyerMaker: boolean;
  createdAt: Date;
}

// Market Data Types
export interface Ticker {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  high24h: string;
  low24h: string;
  volume24h: string;
  quoteVolume24h: string;
  openPrice: string;
  closePrice: string;
  bidPrice: string;
  askPrice: string;
  timestamp: number;
}

export interface OrderBookLevel {
  price: string;
  quantity: string;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface Candlestick {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// WebSocket Types
export interface WsMessage<T = unknown> {
  event: string;
  channel?: string;
  data: T;
  timestamp: number;
}

export interface WsSubscription {
  channel: string;
  params?: Record<string, string>;
}

// Event Types (for message queue)
export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  pairId: string;
  side: OrderSide;
  type: OrderType;
  price?: string;
  quantity: string;
  timestamp: number;
}

export interface TradeExecutedEvent {
  tradeId: string;
  pairId: string;
  price: string;
  quantity: string;
  buyerId: string;
  sellerId: string;
  isBuyerMaker: boolean;
  timestamp: number;
}

export interface DepositDetectedEvent {
  userId: string;
  assetId: string;
  amount: string;
  txHash: string;
  confirmations: number;
  timestamp: number;
}

export interface NotificationEvent {
  userId: string;
  channel: NotificationChannel;
  templateId?: string;
  subject?: string;
  content: Record<string, unknown>;
  priority: number;
}
