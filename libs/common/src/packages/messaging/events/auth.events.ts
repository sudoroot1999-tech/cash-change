import { BaseEvent } from './base.event';

/**
 * User registered event
 */
export interface UserRegisteredEvent extends BaseEvent {
  userId: string;
  email: string;
  name?: string;
  referralCode?: string;
  username:string,
  registeredAt?:Date
}

/**
 * User login event
 */
export interface UserLoginEvent extends BaseEvent {
  userId: string;
  ip?: string;
  userAgent: string;
  success?: boolean;
  failureReason?: string;
  country?: string;
  email:string;
  ipAddress?:string,
  deviceId?:string,
  loginAt?: Date,
}

/**
 * User logout event
 */
export interface UserLogoutEvent extends BaseEvent {
  userId: string;
  sessionId?: string;
  email:string;
  reason?:string;
  logoutAt?:Date;
}

/**
 * Password reset requested event
 */
export interface PasswordResetRequestedEvent extends BaseEvent {
  userId: string;
  email: string;
  resetToken?: string;
  expiresAt?: Date;
  ipAddress?:string;
  requestedAt?:Date
}

/**
 * Password changed event
 */
export interface PasswordChangedEvent extends BaseEvent {
  userId: string;
  changedAt: Date;
  email:string;
  changedBy?:'user' | 'admin' | 'reset'
}

/**
 * Two-factor authentication enabled event
 */
export interface TwoFactorEnabledEvent extends BaseEvent {
  userId: string;
  method: 'totp' | 'sms' | 'email';
  email:string;
  enabledAt?:Date
}

/**
 * Two-factor authentication disabled event
 */
export interface TwoFactorDisabledEvent extends BaseEvent {
  userId: string;
  email:string;
  disabledAt?:Date
}

/**
 * Account locked event
 */
export interface AccountLockedEvent extends BaseEvent {
  userId: string;
  reason: string;
  lockedUntil?: Date;
}

/**
 * Account unlocked event
 */
export interface AccountUnlockedEvent extends BaseEvent {
  userId: string;
  unlockedBy: string;
}

/**
 * Email verification requested event
 */
export interface EmailVerificationRequestedEvent extends BaseEvent {
  userId: string;
  email: string;
  verificationToken?: string;
  requestedAt?:Date
}

/**
 * Email verified event
 */
export interface EmailVerifiedEvent extends BaseEvent {
  userId: string;
  email: string;
  verifiedAt: Date;
}
