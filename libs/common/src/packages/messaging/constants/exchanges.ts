/**
 * RabbitMQ Exchange Names
 * Using topic exchanges for flexible routing
 */

export const EXCHANGES = {
  // Auth & User Management
  USER_EVENTS: 'user.events',
  AUTH_EVENTS: 'auth.events',
  
  // Wallet & Finance
  WALLET_EVENTS: 'wallet.events',
  P2P_LENDING_EVENTS: 'p2p.lending.events',
  
  // Trading & Matching
  TRADING_EVENTS: 'trading.events',
  MATCHING_ENGINE_EVENTS: 'matching.events',
  
  // Market Data
  MARKET_DATA_EVENTS: 'market.data.events',
  
  // Compliance & Security
  KYC_EVENTS: 'kyc.events',
  COMPLIANCE_EVENTS: 'compliance.events',
  
  // Notifications
  NOTIFICATION_EVENTS: 'notification.events',
  
  // Gamification & Rewards
  GAMIFICATION_EVENTS: 'gamification.events',
  
  // Analytics
  ANALYTICS_EVENTS: 'analytics.events',
  
  // Audit & Logging
  AUDIT_EVENTS: 'audit.events',
  
  // Dead Letter Exchange
  DLX: 'dlx.exchange',
} as const;

export type ExchangeName = typeof EXCHANGES[keyof typeof EXCHANGES];
