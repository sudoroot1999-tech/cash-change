/**
 * RabbitMQ Queue Names
 * Queues for command/job processing
 */

export const QUEUES = {
  // Auth Service Queues
  USER_REGISTERED: 'auth.user.registered',
  USER_LOGIN: 'auth.user.login',
  USER_CODE_REQUESTED:'auth.code.request',
  PASSWORD_RESET_REQUESTED: 'auth.password.reset',
  PASSWORD_CHANGED:'auth.password.change',
  TWO_FACTOR_SETUP: 'auth.2fa.setup',
  TWO_FACTOR_ENABLED: 'auth.2fa.enable',
  TWO_FACTOR_DISABLED: 'auth.2fa.disable',
  EMAIL_VERIFICATION_REQUESTED: 'auth.email.verification',
  EMAIL_VERIFIED : 'auth.email.verified',
  ACCOUNT_LOCKED : 'auth.account.locked',

  // User Service Queues
  PROFILE_UPDATE: 'user.profile.update',
  AVATAR_UPLOAD: 'user.avatar.upload',
  PREFERENCES_UPDATE: 'user.preferences.update',
  
  // Wallet Service Queues
  DEPOSIT_PROCESS: 'wallet.deposit.process',
  DEPOSIT_CONFIRMED: 'wallet.deposit.confirmed',
  WITHDRAWAL_REQUEST: 'wallet.withdrawal.request',
  WITHDRAWAL_PROCESS: 'wallet.withdrawal.process',
  WITHDRAWAL_APPROVED: 'wallet.withdrawal.approved',
  WITHDRAWAL_REJECTED: 'wallet.withdrawal.rejected',
  WITHDRAWAL_FAILED: 'wallet.withdrawal.failed',
  WITHDRAWAL_COMPLETED: 'wallet.withdrawal.completed',
  WITHDRAWAL_CANCELLED: 'wallet.withdrawal.cancelled',
  BALANCE_UPDATE: 'wallet.balance.update',
  INTERNAL_TRANSFER: 'wallet.transfer.internal',
  
  // Trading Service Queues
  ORDER_CREATE: 'trading.order.create',
  ORDER_CANCEL: 'trading.order.cancel',
  ORDER_MATCHED: 'trading.order.matched',
  ORDER_FILLED: 'trading.order.filled',
  TRADE_EXECUTE: 'trading.trade.execute',
  
  // Matching Engine Queues
  MATCHING_ORDER_RECEIVED: 'matching.order.received',
  MATCHING_ORDER_PROCESS: 'matching.order.process',
  MATCHING_ORDERBOOK_UPDATE: 'matching.orderbook.update',
  
  // KYC Service Queues
  KYC_SUBMIT: 'kyc.submit',
  KYC_REVIEW: 'kyc.review',
  KYC_APPROVE: 'kyc.approve',
  KYC_REJECT: 'kyc.reject',
  
  // Notification Service Queues
  EMAIL_SEND: 'notification.email.send',
  SMS_SEND: 'notification.sms.send',
  PUSH_SEND: 'notification.push.send',
  IN_APP_NOTIFICATION: 'notification.inapp',
  
  // Gamification Service Queues
  XP_AWARD: 'gamification.xp.award',
  BADGE_EARN: 'gamification.badge.earn',
  MISSION_COMPLETE: 'gamification.mission.complete',
  ACHIEVEMENT_UNLOCK: 'gamification.achievement.unlock',
  REWARD_CLAIM: 'gamification.reward.claim',
  
  // Analytics Queues
  ANALYTICS_EVENT: 'analytics.event.process',
  ANALYTICS_REPORT: 'analytics.report.generate',
  
  // Audit Queues
  AUDIT_LOG: 'audit.log',
  
  // Dead Letter Queue
  DLX_QUEUE: 'dlx.queue',
} as const;

export type QueueName = typeof QUEUES[keyof typeof QUEUES];
