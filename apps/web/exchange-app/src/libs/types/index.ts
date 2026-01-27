import {
  USER_STATUS,
  USER_TIERS,
  KYC_LEVELS,
  KYC_STATUS,
  DOCUMENT_TYPE,
  ORDER_SIDES,
  ORDER_STATUS,
  TIME_IN_FORCE,
  MARGIN_MODES,
  TRANSACTION_STATUS,
  LOGIN_STATUS,
  API_KEY_PERMISSIONS,
  BUG_SEVERITY,
  BUGBOUNTY_STATUS,
  COLD_WALLET_STATUS,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  RISK_LEVELS,
  WHITE_LIST_STATUS,
  DELIVERY_STATUS,
  NOTIFICATION_CHANNELS,
  NOTIFICAION_STATUS,
  NOTIFICATION_PRIORITY,
  DEVICE_PLATFORM,
  HTTP_STATUS,
  KYC_PROVIDER,
  COMPLIANCE_CHECK_TYPE,
  COMPLIANCE_CHECK_STATUS,
  ADMIN_ROLE,
  ADMIN_STATUS,
  ACTION_TYPE,
  ACTION_STATUS,
  AUDIT_LOG_ACTION,
  ANNOUNCEMENT_TYPE,
  ANNOUNCEMENT_STATUS,
  WORKFLOW_STATUS,
  ROLE,
  SAR_STATUS,
  SAR_TYPE,
  SECURITY_EVENT_TYPE,
  MONITORING_STATUS,
  INCIDENT_TYPE,
  WALLET_TYPE,
  ADDRESS_TYPE,
  ADDRESS_CHAIN,
  DEPOSIT_STATUS,
  WITHDRAWAL_STATUS,
  WITHDRAWAL_RISK_LEVEL,
  INTERMAL_TRANSFER_STATUS,
  TRANSACTION_TYPE,
  ORDER_TYPE,
  TRADING_TYPE,
  ASSET_TYPE,
  REWARD_TYPE,
  REWARD_STATUS,
  XP_SOURCE,
  BADGE_RARITY,
  BADGE_CATEGORY,
  CHALLENGE_TYPE,
  CHALLENGE_STATUS,
  MISSION_TYPE,
  MISSION_STATUS,
  LEADERBOARD_TYPE,
  LEADERBOARD_PERIOD,
  POST_TYPE,
  POST_VISIBILITY,
  MESSAGE_TYPE,
  MESSAGE_STATUS,
  NOTIFICATION_TYPE,
  DATA_SOURCE,
  COLD_WALLET_TYPE,
  INSURANCE_FUND_TRANSACTION_TYPE,
} from '../constants';
import { AuthenticatedUser } from './auth.types';

export type BugSeverity =
  (typeof BUG_SEVERITY)[keyof typeof BUG_SEVERITY];

export type BugBountyStatus =
  (typeof BUGBOUNTY_STATUS)[keyof typeof BUGBOUNTY_STATUS];

export type ColdWalletType =
  (typeof COLD_WALLET_TYPE)[keyof typeof COLD_WALLET_TYPE];

export type ColdWalletStatus =
  (typeof COLD_WALLET_STATUS)[keyof typeof COLD_WALLET_STATUS];

export type InsuranceFundTransactionType =
  (typeof INSURANCE_FUND_TRANSACTION_TYPE)[keyof typeof INSURANCE_FUND_TRANSACTION_TYPE];

export type WhiteListStatus =
  (typeof WHITE_LIST_STATUS)[keyof typeof WHITE_LIST_STATUS];

export type DeliveryStatus =
  (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

export type NotificationPriority =
  (typeof NOTIFICATION_PRIORITY)[keyof typeof NOTIFICATION_PRIORITY];

/* ===========================
   HTTP
=========================== */

export type HttpStatusCode =
  (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

/* ===========================
 Admin / Audit
=========================== */
export type AdminRole = (typeof ADMIN_ROLE)[keyof typeof ADMIN_ROLE];
export type AdminStatus = (typeof ADMIN_STATUS)[keyof typeof ADMIN_STATUS];
export type ActionType = (typeof ACTION_TYPE)[keyof typeof ACTION_TYPE];
export type ActionStatus = (typeof ACTION_STATUS)[keyof typeof ACTION_STATUS];
export type AuditLogAction = (typeof AUDIT_LOG_ACTION)[keyof typeof AUDIT_LOG_ACTION];

/* ===========================
   Announcement / Workflow
=========================== */
export type AnnouncementType =
  (typeof ANNOUNCEMENT_TYPE)[keyof typeof ANNOUNCEMENT_TYPE];
export type AnnouncementStatus =
  (typeof ANNOUNCEMENT_STATUS)[keyof typeof ANNOUNCEMENT_STATUS];
export type WorkflowStatus =
  (typeof WORKFLOW_STATUS)[keyof typeof WORKFLOW_STATUS];

/* ===========================
   User / Auth
=========================== */
export type Role = (typeof ROLE)[keyof typeof ROLE];
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
export type UserTier = (typeof USER_TIERS)[keyof typeof USER_TIERS];
export type LoginStatus = (typeof LOGIN_STATUS)[keyof typeof LOGIN_STATUS];
export type ApiKeyPermission =
  (typeof API_KEY_PERMISSIONS)[keyof typeof API_KEY_PERMISSIONS];

/* ===========================
   KYC / Compliance
=========================== */
export type KycLevel = (typeof KYC_LEVELS)[keyof typeof KYC_LEVELS];
export type KycStatus = (typeof KYC_STATUS)[keyof typeof KYC_STATUS];
export type DocumentType =
  (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE];
export type KycProvider =
  (typeof KYC_PROVIDER)[keyof typeof KYC_PROVIDER];
export type ComplianceCheckType =
  (typeof COMPLIANCE_CHECK_TYPE)[keyof typeof COMPLIANCE_CHECK_TYPE];
export type ComplianceCheckStatus =
  (typeof COMPLIANCE_CHECK_STATUS)[keyof typeof COMPLIANCE_CHECK_STATUS];
export type SarStatus = (typeof SAR_STATUS)[keyof typeof SAR_STATUS];
export type SarType = (typeof SAR_TYPE)[keyof typeof SAR_TYPE];

/* ===========================
   Risk / Security
=========================== */
export type RiskLevel = (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS];
export type SecurityEventType =
  (typeof SECURITY_EVENT_TYPE)[keyof typeof SECURITY_EVENT_TYPE];
export type MonitoringStatus =
  (typeof MONITORING_STATUS)[keyof typeof MONITORING_STATUS];
export type IncidentType =
  (typeof INCIDENT_TYPE)[keyof typeof INCIDENT_TYPE];
export type IncidentSeverity =
  (typeof INCIDENT_SEVERITY)[keyof typeof INCIDENT_SEVERITY];
export type IncidentStatus =
  (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS];

/* ===========================
   Wallet / Transaction
=========================== */
export type WalletType = (typeof WALLET_TYPE)[keyof typeof WALLET_TYPE];
export type AddressType =
  (typeof ADDRESS_TYPE)[keyof typeof ADDRESS_TYPE];
export type AddressChain =
  (typeof ADDRESS_CHAIN)[keyof typeof ADDRESS_CHAIN];
export type DepositStatus =
  (typeof DEPOSIT_STATUS)[keyof typeof DEPOSIT_STATUS];
export type WithdrawalStatus =
  (typeof WITHDRAWAL_STATUS)[keyof typeof WITHDRAWAL_STATUS];
export type WithdrawalRiskLevel =
  (typeof WITHDRAWAL_RISK_LEVEL)[keyof typeof WITHDRAWAL_RISK_LEVEL];
export type InternalTransferStatus =
  (typeof INTERMAL_TRANSFER_STATUS)[keyof typeof INTERMAL_TRANSFER_STATUS];
export type TransactionType =
  (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];
export type TransactionStatus =
  (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];

/* ===========================
   Trading
=========================== */
export type OrderType = (typeof ORDER_TYPE)[keyof typeof ORDER_TYPE];
export type OrderSide = (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES];
export type OrderStatus =
  (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type TimeInForce =
  (typeof TIME_IN_FORCE)[keyof typeof TIME_IN_FORCE];
export type TradingType =
  (typeof TRADING_TYPE)[keyof typeof TRADING_TYPE];
export type MarginMode =
  (typeof MARGIN_MODES)[keyof typeof MARGIN_MODES];
export type AssetType =
  (typeof ASSET_TYPE)[keyof typeof ASSET_TYPE];

/* ===========================
   Rewards / XP
=========================== */
export type RewardType =
  (typeof REWARD_TYPE)[keyof typeof REWARD_TYPE];
export type RewardStatus =
  (typeof REWARD_STATUS)[keyof typeof REWARD_STATUS];
export type XpSource =
  (typeof XP_SOURCE)[keyof typeof XP_SOURCE];

/* ===========================
   Gamification
=========================== */
export type BadgeRarity =
  (typeof BADGE_RARITY)[keyof typeof BADGE_RARITY];
export type BadgeCategory =
  (typeof BADGE_CATEGORY)[keyof typeof BADGE_CATEGORY];
export type ChallengeType =
  (typeof CHALLENGE_TYPE)[keyof typeof CHALLENGE_TYPE];
export type ChallengeStatus =
  (typeof CHALLENGE_STATUS)[keyof typeof CHALLENGE_STATUS];
export type MissionType =
  (typeof MISSION_TYPE)[keyof typeof MISSION_TYPE];
export type MissionStatus =
  (typeof MISSION_STATUS)[keyof typeof MISSION_STATUS];
export type LeaderboardType =
  (typeof LEADERBOARD_TYPE)[keyof typeof LEADERBOARD_TYPE];
export type LeaderboardPeriod =
  (typeof LEADERBOARD_PERIOD)[keyof typeof LEADERBOARD_PERIOD];

/* ===========================
   Social
=========================== */
export type PostType =
  (typeof POST_TYPE)[keyof typeof POST_TYPE];
export type PostVisibility =
  (typeof POST_VISIBILITY)[keyof typeof POST_VISIBILITY];
export type CommentType =
  (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];
export type MessageStatus =
  (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];
export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];
export type NotificationChannel =
  (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];
export type NotificationStatus =
  (typeof NOTIFICAION_STATUS)[keyof typeof NOTIFICAION_STATUS];

/* ===========================
   Misc
=========================== */
export type HttpStatus =
  (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];
export type DevicePlatform =
  (typeof DEVICE_PLATFORM)[keyof typeof DEVICE_PLATFORM];
export type DataSource =
  (typeof DATA_SOURCE)[keyof typeof DATA_SOURCE];



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
  data: T;
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
