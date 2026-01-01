/**
 * RabbitMQ Routing Keys
 * Pattern: {service}.{entity}.{action}
 */

export const ROUTING_KEYS = {
  // Auth Events
  USER_REGISTERED: 'auth.user.registered',
  USER_LOGIN: 'auth.user.login',
  USER_LOGOUT: 'auth.user.logout',
  PASSWORD_RESET_REQUESTED: 'auth.password.reset.requested',
  PASSWORD_CHANGED: 'auth.password.changed',
  TWO_FACTOR_ENABLED: 'auth.2fa.enabled',
  TWO_FACTOR_DISABLED: 'auth.2fa.disabled',
  EMAIL_VERIFIED: 'auth.email.verified',
  ACCOUNT_LOCKED: 'auth.account.locked',
  ACCOUNT_UNLOCKED: 'auth.account.unlocked',
  EMAIL_VERIFICATION_REQUESTED: 'auth.email.verification.requested',
  
  // User Events
  PROFILE_UPDATED: 'user.profile.updated',
  AVATAR_UPLOADED: 'user.avatar.uploaded',
  PREFERENCES_UPDATED: 'user.preferences.updated',
  USER_DELETED: 'user.deleted',
  USER_SUSPENDED: 'user.suspended',
  USER_ACTIVATED: 'user.activated',
  
  // Wallet Events
  DEPOSIT_DETECTED: 'wallet.deposit.detected',
  DEPOSIT_CONFIRMED: 'wallet.deposit.confirmed',
  WITHDRAWAL_REQUESTED: 'wallet.withdrawal.requested',
  WITHDRAWAL_APPROVED: 'wallet.withdrawal.approved',
  WITHDRAWAL_REJECTED: 'wallet.withdrawal.rejected',
  WITHDRAWAL_COMPLETED: 'wallet.withdrawal.completed',
  WITHDRAWAL_FAILED: 'wallet.withdrawal.failed',
  BALANCE_UPDATED: 'wallet.balance.updated',
  WALLET_CREATED: 'wallet.created',
  INTERNAL_TRANSFER: 'wallet.transfer.internal',
  
  // Trading Events
  ORDER_CREATED: 'trading.order.created',
  ORDER_PLACED: 'trading.order.placed',
  ORDER_CANCELLED: 'trading.order.cancelled',
  ORDER_MATCHED: 'trading.order.matched',
  ORDER_PARTIALLY_FILLED: 'trading.order.partially_filled',
  ORDER_FILLED: 'trading.order.filled',
  ORDER_REJECTED: 'trading.order.rejected',
  TRADE_EXECUTED: 'trading.trade.executed',
  ORDERBOOK_UPDATED: 'trading.orderbook.updated',
  ORDERBOOK_SNAPSHOT: 'trading.orderbook.snapshot',
  MARKET_PRICE_UPDATED: 'trading.market.price.updated',
  STOP_ORDER_TRIGGERED: 'trading.order.stop.triggered',
  
  // Matching Engine Events
  MATCHING_ORDER_RECEIVED: 'matching.order.received',
  MATCHING_ORDER_MATCH: 'matching.order.match',
  MATCHING_ORDERBOOK_STATE_CHANGED: 'matching.orderbook.state.changed',
  MATCHING_ENGINE_HEALTH: 'matching.engine.health',
  MATCHING_ORDERBOOK_SNAPSHOT_CREATED: 'matching.orderbook.snapshot.created',
  MARKET_MAKER_ORDER: 'matching.market_maker.order',
  LIQUIDITY_POOL_UPDATED: 'matching.liquidity.pool.updated',
  CIRCUIT_BREAKER_TRIGGERED: 'matching.circuit_breaker.triggered',
  TRADING_RESUMED: 'matching.trading.resumed',
  
  // KYC Events
  KYC_SUBMITTED: 'kyc.submitted',
  KYC_UNDER_REVIEW: 'kyc.under_review',
  KYC_APPROVED: 'kyc.approved',
  KYC_REJECTED: 'kyc.rejected',
  KYC_EXPIRED: 'kyc.expired',
  KYC_DOCUMENT_REQUESTED: 'kyc.document.requested',
  KYC_LIMIT_UPDATED: 'kyc.limit.updated',
  
  // Notification Events
  EMAIL_SEND: 'notification.email.send',
  EMAIL_SENT: 'notification.email.sent',
  EMAIL_FAILED: 'notification.email.failed',
  SMS_SEND: 'notification.sms.send',
  SMS_SENT: 'notification.sms.sent',
  SMS_FAILED: 'notification.sms.failed',
  PUSH_SEND: 'notification.push.send',
  PUSH_SENT: 'notification.push.sent',
  PUSH_FAILED: 'notification.push.failed',
  IN_APP_NOTIFICATION: 'notification.inapp',
  
  // Gamification Events
  XP_EARNED: 'gamification.xp.earned',
  LEVEL_UP: 'gamification.level.up',
  BADGE_EARNED: 'gamification.badge.earned',
  MISSION_COMPLETED: 'gamification.mission.completed',
  MISSION_PROGRESS_UPDATED: 'gamification.mission.progress.updated',
  ACHIEVEMENT_UNLOCKED: 'gamification.achievement.unlocked',
  STREAK_UPDATED: 'gamification.streak.updated',
  LEADERBOARD_POSITION_CHANGED: 'gamification.leaderboard.position.changed',
  REWARD_CLAIMED: 'gamification.reward.claimed',
  
  // Wildcard patterns for subscriptions
  ALL_AUTH: 'auth.#',
  ALL_USER: 'user.#',
  ALL_WALLET: 'wallet.#',
  ALL_TRADING: 'trading.#',
  ALL_MATCHING: 'matching.#',
  ALL_KYC: 'kyc.#',
  ALL_NOTIFICATION: 'notification.#',
  ALL_GAMIFICATION: 'gamification.#',
  ALL_EVENTS: '#',
} as const;

export type RabbitMQRoutingKey = typeof ROUTING_KEYS[keyof typeof ROUTING_KEYS];
