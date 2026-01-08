// User Status
export const USER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
  DELETED: 'deleted'

} as const;

// User Tiers
export const USER_TIERS = {
  BASIC: 'basic',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  VIP: 'vip',
  ULTRA_VIP: 'ultra_vip',
  INSTITUTIONAL: 'institutional',
} as const;

// KYC Levels
export const KYC_LEVELS = {
  NONE: 0,
  BASIC: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
} as const;

// KYC Status
export const KYC_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
} as const;

// KYC Documents
export const DOCUMENT_TYPE = {
  PASSPORT: 'passport',
  ID_CARD: 'id_card',
  DRIVER_LICENSE: 'driver_license',
  PROOF_OF_ADDRESS: 'proof_of_address',
  SELFIE: 'selfie'
} as const;

// Order Types
export const ORDER_TYPES = {
  MARKET: 'market',
  LIMIT: 'limit',
  STOP_LOSS: 'stop_loss',
  STOP_LIMIT: 'stop_limit',
  TRAILING_STOP: 'trailing_stop',
  ICEBERG: 'iceberg'
} as const;

// Order Sides
export const ORDER_SIDES = {
  BUY: 'buy',
  SELL: 'sell',
} as const;

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  OPEN: 'open',
  PARTIALLY_FILLED: 'partially_filled',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
} as const;

// Time in Force
export const TIME_IN_FORCE = {
  GTC: 'GTC', // Good Till Cancelled
  IOC: 'IOC', // Immediate or Cancel
  FOK: 'FOK', // Fill or Kill
  GTD: 'GTD'  // Good Till Date
} as const;

// Trading Types
export const TRADING_TYPES = {
  SPOT: 'spot',
  MARGIN: 'margin',
  FUTURES: 'futures',
  OPTIONS: 'options'
} as const;

// Margin Modes
export const MARGIN_MODES = {
  CROSS: 'cross',
  ISOLATED: 'isolated'
} as const;

// Assets Types
export const ASSET_TYPES = {
  CRYPTO: 'crypto',
  NFT: 'nft',
  RWA: 'rwa',
  TOKEN: 'token'
} as const;

// Transaction Types
export const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  TRANSFER_IN: 'transfer_in',
  TRANSFER_OUT: 'transfer_out',
  TRADE: 'trade',
  FEE: 'fee',
  REWARD: 'reward',
} as const;

// Transaction Status
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// Reward types
export const REWARD_TYPES = {
  XP: 'xp',
  COINS: 'coins',
  TOKEN: 'token',
  BADGE: 'badge',
  DISCOUNT: 'discount',
  CASHBACK: 'cashback'
} as const;

// Login Status
export const LOGIN_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
  SUSPICIOUS: 'SUSPICIOUS',
} as const;

// Api Key Permissions
export const API_KEY_PERMISSIONS = {
  READ: 'READ',
  TRADE: 'TRADE',
  WITHDRAW: 'WITHDRAW',
} as const;

// Bug Bounty Status
export const BUG_SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
} as const;

// Bug Bounty Status
export const BUGBOUNTY_STATUS = {
  SUBMITTED: 'SUBMITTED',
  TRIAGING: 'TRIAGING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  RESOLVED: 'RESOLVED',
  REWARDED: 'REWARDED',
} as const;

// Cold Wallet Type
export const COLD_WALLET_TYPES = {
  MULTI_SIG: 'MULTI_SIG',
  HARDWARE: 'HARDWARE',
  PAPER: 'PAPER',
  OFFLINE: 'OFFLINE',
} as const;

// Cold Wallet Status
export const COLD_WALLET_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
} as const;

// Incident Type
export const INCIDENT_TYPES = {
  SECURITY_BREACH: 'SECURITY_BREACH',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  WITHDRAWAL_ANOMALY: 'WITHDRAWAL_ANOMALY',
  API_ABUSE: 'API_ABUSE',
  DDOS_ATTACK: 'DDOS_ATTACK',
  SYSTEM_FAILURE: 'SYSTEM_FAILURE',
  OTHER: 'OTHER',
} as const;

// Incident Severity
export const INCIDENT_SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

// Incident Status
export const INCIDENT_STATUS = {
  DETECTED: 'DETECTED',
  INVESTIGATING: 'INVESTIGATING',
  CONTAINED: 'CONTAINED',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;

// Insurance Fund Transaction Type
export const INSURANCE_FUND_TRANSACTION_TYPES = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
  CLAIM: 'CLAIM',
  INTEREST: 'INTEREST',
} as const;

// Security Event Types
export const SECURITY_EVENT_TYPES = {
  LOGIN_ATTEMPT: 'LOGIN_ATTEMPT',
  NEW_DEVICE: 'NEW_DEVICE',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  EMAIL_CHANGE: 'EMAIL_CHANGE',
  WITHDRAWAL_REQUEST: 'WITHDRAWAL_REQUEST',
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_DELETED: 'API_KEY_DELETED',
  TWO_FA_ENABLED: 'TWO_FA_ENABLED',
  TWO_FA_DISABLED: 'TWO_FA_DISABLED',
  WHITELIST_ADDRESS_ADDED: 'WHITELIST_ADDRESS_ADDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_BLOCKED: 'LOGIN_BLOCKED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  TWO_FACTOR_ENABLED: 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED: 'TWO_FACTOR_DISABLED',
  WITHDRAWAL_INITIATED: 'WITHDRAWAL_INITIATED',
  WITHDRAWAL_APPROVED: 'WITHDRAWAL_APPROVED',
  WITHDRAWAL_REJECTED: 'WITHDRAWAL_REJECTED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  CSRF_DETECTED: 'CSRF_DETECTED',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  KYC_SUBMITTED: 'KYC_SUBMITTED',
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
  LARGE_TRANSACTION: 'LARGE_TRANSACTION',
  UNUSUAL_PATTERN: 'UNUSUAL_PATTERN',
  IP_BLACKLISTED: 'IP_BLACKLISTED',
  DEVICE_CHANGED: 'DEVICE_CHANGED',
} as const;

// Risk Levels
export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

// White List Status
export const WHITE_LIST_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
} as const;

// Notification Delivery Status

export const DELIVERY_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  BOUNCED: 'bounced',
  OPENED: 'opened',
  CLICKED: 'clicked',
} as const;

// Notification Channel
export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app',
  TELEGRAM: 'telegram',
  DISCORD: 'discord',
  WHATSAPP: 'whatsapp'
} as const;

// Notification Status
export const NOTIFICAION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  TRANSACTIONAL: 'transactional',
  SECURITY: 'security',
  MARKETING: 'marketing',
  PRICE_ALERT: 'price_alert',
  TRADING_SIGNAL: 'trading_signal',
  KYC_UPDATE: 'kyc_update',
  NEWS: 'news',
  COMMON: 'common',
  INFO: 'info'
} as const;

// Notification Priority
export const NOTIFICATION_PRIORITY = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
} as const;

// Device Platform
export const DEVICE_PLATFORM = {
  IOS: 'ios',
  ANDROID: 'android',
  WEB: 'web',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  PUBLIC_API: { windowMs: 60000, max: 100 },
  AUTHENTICATED_API: { windowMs: 60000, max: 600 },
  TRADING_API: { windowMs: 1000, max: 10 },
  WEBSOCKET: { windowMs: 1000, max: 5 },
} as const;

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Redis Key Prefixes
export const REDIS_KEYS = {
  SESSION: 'session:',
  USER_CACHE: 'user:cache:',
  RATE_LIMIT: 'rate:limit:',
  ORDER_BOOK: 'orderbook:',
  TICKER: 'ticker:',
  MARKET_DATA: 'market:',
  NOTIFICATION_QUEUE: 'notification:queue:',
} as const;


