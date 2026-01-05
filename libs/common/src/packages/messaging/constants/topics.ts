/**
 * Kafka Topic Names
 * Topics for event streaming and analytics
 */

export const KAFKA_TOPICS = {
  // User & Auth Events (Event Sourcing)
  USER_EVENTS: 'user-events',
  AUTH_EVENTS: 'auth-events',
  
  // Wallet Events (Event Sourcing)
  WALLET_EVENTS: 'wallet-events',
  
  // Trading Events (Event Sourcing)
  // TRADING_EVENTS: 'trading-events',
  
  // Matching Engine Events (High-throughput)
  // MATCHING_ENGINE_EVENTS: 'matching-engine-events',
  // ORDERBOOK_SNAPSHOTS: 'orderbook-snapshots',
  
  // Market Data (Real-time streaming)
  // MARKET_DATA_TICKER: 'market-data-ticker',
  // MARKET_DATA_TRADES: 'market-data-trades',
  // MARKET_DATA_ORDERBOOK: 'market-data-orderbook',
  // MARKET_DATA_KLINES: 'market-data-klines',
  
  // KYC & Compliance Events
  KYC_EVENTS: 'kyc-events',
  COMPLIANCE_EVENTS: 'compliance-events',
  
  // Notification Events
  NOTIFICATION_EVENTS: 'notification-events',
  
  // Gamification Events
  GAMIFICATION_EVENTS: 'gamification-events',
  
  // Analytics (High-volume data)
  ANALYTICS_USER_ACTIVITY: 'analytics-user-activity',
  ANALYTICS_TRADING: 'analytics-trading',
  ANALYTICS_METRICS: 'analytics-metrics',
  
  // Audit & Security Logs
  AUDIT_LOGS: 'audit-logs',
  SECURITY_EVENTS: 'security-events',
  
  // System Health
  SYSTEM_METRICS: 'system-metrics',
  ERROR_LOGS: 'error-logs',
} as const;

export type KafkaTopicName = typeof KAFKA_TOPICS[keyof typeof KAFKA_TOPICS];
