import { NotificationPriority } from 'libs/common/src/types';
import { BaseEvent } from './base.event';


/**
 * Send email event
 */
export interface SendEmailEvent extends BaseEvent {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string;
  }>;
  priority?: NotificationPriority;
}

/**
 * Email sent event
 */
export interface EmailSentEvent extends BaseEvent {
  to: string | string[];
  subject: string;
  template: string;
  messageId: string;
  sentAt: Date;
}

/**
 * Email failed event
 */
export interface EmailFailedEvent extends BaseEvent {
  to: string | string[];
  subject: string;
  template: string;
  error: string;
  failedAt: Date;
}

/**
 * Send SMS event
 */
export interface SendSmsEvent extends BaseEvent {
  to: string;
  message: string;
  countryCode?: string;
  priority?: NotificationPriority;
}

/**
 * SMS sent event
 */
export interface SmsSentEvent extends BaseEvent {
  to: string;
  message: string;
  messageId: string;
  sentAt: Date;
}

/**
 * SMS failed event
 */
export interface SmsFailedEvent extends BaseEvent {
  to: string;
  message: string;
  error: string;
  failedAt: Date;
}

/**
 * Send push notification event
 */
export interface SendPushEvent extends BaseEvent {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: number;
  sound?: string;
  priority?: NotificationPriority;
  deviceTokens?: string[];
}

/**
 * Push notification sent event
 */
export interface PushSentEvent extends BaseEvent {
  userId: string;
  title: string;
  messageId: string;
  devicesSent: number;
  sentAt: Date;
}

/**
 * Push notification failed event
 */
export interface PushFailedEvent extends BaseEvent {
  userId: string;
  title: string;
  error: string;
  failedAt: Date;
}

/**
 * In-app notification event
 */
export interface InAppNotificationEvent extends BaseEvent {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  imageUrl?: string;
  priority?: NotificationPriority;
}
