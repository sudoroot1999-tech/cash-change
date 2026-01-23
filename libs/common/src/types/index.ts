import {
  USER_STATUS,
  USER_TIERS,
  KYC_LEVELS,
  KYC_STATUS,
  DOCUMENT_TYPE,

  ORDER_TYPES,
  ORDER_SIDES,
  ORDER_STATUS,
  TIME_IN_FORCE,
  TRADING_TYPES,
  MARGIN_MODES,

  ASSET_TYPES,

  TRANSACTION_TYPES,
  TRANSACTION_STATUS,

  REWARD_TYPES,

  LOGIN_STATUS,

  API_KEY_PERMISSIONS,

  BUG_SEVERITY,
  BUGBOUNTY_STATUS,

  COLD_WALLET_TYPES,
  COLD_WALLET_STATUS,

  INCIDENT_TYPES,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,

  INSURANCE_FUND_TRANSACTION_TYPES,

  SECURITY_EVENT_TYPES,

  RISK_LEVELS,

  WHITE_LIST_STATUS,

  DELIVERY_STATUS,

  NOTIFICATION_CHANNELS,
  NOTIFICAION_STATUS,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,

  DEVICE_PLATFORM,

  HTTP_STATUS,
  KYC_PROVIDER,
  COMPLIANCE_CHECK_TYPE,
  COMPLIANCE_CHECK_STATUS,
} from '../constants';
import { AuthenticatedUser } from './auth.types';

/* ===========================
   User / Auth
=========================== */

export type UserStatus =
  (typeof USER_STATUS)[keyof typeof USER_STATUS];

export type UserTier =
  (typeof USER_TIERS)[keyof typeof USER_TIERS];

export type LoginStatus =
  (typeof LOGIN_STATUS)[keyof typeof LOGIN_STATUS];

/* ===========================
   KYC
=========================== */

export type KycLevel =
  (typeof KYC_LEVELS)[keyof typeof KYC_LEVELS];

export type KycStatus =
  (typeof KYC_STATUS)[keyof typeof KYC_STATUS];

export type DocumentType =
  (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE];

export type KycProvider =
  (typeof KYC_PROVIDER)[keyof typeof KYC_PROVIDER];

/* ===========================
   COMPLIANCE
=========================== */

export type ComplianceCheckType =
  (typeof COMPLIANCE_CHECK_TYPE)[keyof typeof COMPLIANCE_CHECK_TYPE];

export type ComplianceCheckStatus =
  (typeof COMPLIANCE_CHECK_STATUS)[keyof typeof COMPLIANCE_CHECK_STATUS];

/* ===========================
   Trading / Orders
=========================== */

export type OrderType =
  (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];

export type OrderSide =
  (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES];

export type OrderStatus =
  (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export type TimeInForce =
  (typeof TIME_IN_FORCE)[keyof typeof TIME_IN_FORCE];

export type TradingType =
  (typeof TRADING_TYPES)[keyof typeof TRADING_TYPES];

export type MarginMode =
  (typeof MARGIN_MODES)[keyof typeof MARGIN_MODES];

/* ===========================
   Assets
=========================== */

export type AssetType =
  (typeof ASSET_TYPES)[keyof typeof ASSET_TYPES];

/* ===========================
   Transactions
=========================== */

export type TransactionType =
  (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];

export type TransactionStatus =
  (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];

/* ===========================
   Rewards
=========================== */

export type RewardType =
  (typeof REWARD_TYPES)[keyof typeof REWARD_TYPES];

/* ===========================
   API Keys
=========================== */

export type ApiKeyPermission =
  (typeof API_KEY_PERMISSIONS)[keyof typeof API_KEY_PERMISSIONS];

/* ===========================
   Bug Bounty
=========================== */

export type BugSeverity =
  (typeof BUG_SEVERITY)[keyof typeof BUG_SEVERITY];

export type BugBountyStatus =
  (typeof BUGBOUNTY_STATUS)[keyof typeof BUGBOUNTY_STATUS];

/* ===========================
   Cold Wallet
=========================== */

export type ColdWalletType =
  (typeof COLD_WALLET_TYPES)[keyof typeof COLD_WALLET_TYPES];

export type ColdWalletStatus =
  (typeof COLD_WALLET_STATUS)[keyof typeof COLD_WALLET_STATUS];

/* ===========================
   Incidents / Security
=========================== */

export type IncidentType =
  (typeof INCIDENT_TYPES)[keyof typeof INCIDENT_TYPES];

export type IncidentSeverity =
  (typeof INCIDENT_SEVERITY)[keyof typeof INCIDENT_SEVERITY];

export type IncidentStatus =
  (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS];

export type SecurityEventType =
  (typeof SECURITY_EVENT_TYPES)[keyof typeof SECURITY_EVENT_TYPES];

export type RiskLevel =
  (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS];

/* ===========================
   Insurance Fund
=========================== */

export type InsuranceFundTransactionType =
  (typeof INSURANCE_FUND_TRANSACTION_TYPES)[keyof typeof INSURANCE_FUND_TRANSACTION_TYPES];

/* ===========================
   Whitelist
=========================== */

export type WhiteListStatus =
  (typeof WHITE_LIST_STATUS)[keyof typeof WHITE_LIST_STATUS];

/* ===========================
   Notifications
=========================== */

export type DeliveryStatus =
  (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

export type NotificationChannel =
  (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];

export type NotificationStatus =
  (typeof NOTIFICAION_STATUS)[keyof typeof NOTIFICAION_STATUS];

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type NotificationPriority =
  (typeof NOTIFICATION_PRIORITY)[keyof typeof NOTIFICATION_PRIORITY];

/* ===========================
   Devices
=========================== */

export type DevicePlatform =
  (typeof DEVICE_PLATFORM)[keyof typeof DEVICE_PLATFORM];

/* ===========================
   HTTP
=========================== */

export type HttpStatusCode =
  (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];


export * from "./auth.types";
export * from "./user.types";
export * from "./market.types";
export * from "./security.types";

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

export interface RequestContext {
  user?: AuthenticatedUser;
  fingerprint: string;
  browser?: string;
  os?: string;
  device?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  ipAddress?: string;
  userAgent?: string;
  locationCountry?: string;
  locationCity?: string;
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
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page?: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  meta: {
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
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
