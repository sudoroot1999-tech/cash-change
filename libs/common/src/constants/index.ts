// User Status
export const USER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
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

// Order Types
export const ORDER_TYPES = {
  MARKET: 'market',
  LIMIT: 'limit',
  STOP_LOSS: 'stop_loss',
  STOP_LIMIT: 'stop_limit',
  TRAILING_STOP: 'trailing_stop',
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
  PARTIAL: 'partial',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
} as const;

// Time in Force
export const TIME_IN_FORCE = {
  GTC: 'GTC', // Good Till Cancelled
  IOC: 'IOC', // Immediate or Cancel
  FOK: 'FOK', // Fill or Kill
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

// Notification Channels
export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app',
  TELEGRAM: 'telegram',
  DISCORD: 'discord',
} as const;

// Notification Priority
export const NOTIFICATION_PRIORITY = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
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

// RabbitMQ Exchanges/Queues
export const RABBITMQ = {
  EXCHANGES: {
    ORDERS: 'orders.exchange',
    TRADES: 'trades.exchange',
    NOTIFICATIONS: 'notifications.exchange',
    WALLETS: 'wallets.exchange',
    USERS: 'users.exchange',
    COMPLIANCE: 'compliance.exchange',
  },
  QUEUES: {
    ORDER_CREATED: 'orders.created',
    ORDER_CANCELLED: 'orders.cancelled',
    TRADE_EXECUTED: 'trades.executed',
    DEPOSIT_DETECTED: 'wallets.deposit',
    WITHDRAWAL_REQUEST: 'wallets.withdrawal',
    NOTIFICATION_SEND: 'notifications.send',
    USER_CREATED: 'users.created',
    KYC_UPDATED: 'compliance.kyc_updated',
  },
} as const;
