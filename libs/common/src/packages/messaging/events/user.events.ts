import { BaseEvent } from './base.event';

/**
 * User profile updated event
 */
export interface ProfileUpdatedEvent extends BaseEvent {
  userId: string;
  changes: Record<string, any>;
  updatedFields: string[];
}

/**
 * Avatar uploaded event
 */
export interface AvatarUploadedEvent extends BaseEvent {
  userId: string;
  avatarUrl: string;
  previousAvatarUrl?: string;
}

/**
 * User preferences updated event
 */
export interface PreferencesUpdatedEvent extends BaseEvent {
  userId: string;
  preferences: {
    language?: string;
    timezone?: string;
    currency?: string;
    notifications?: boolean;
  };
}

/**
 * User deleted event
 */
export interface UserDeletedEvent extends BaseEvent {
  userId: string;
  reason?: string;
  deletedBy: string;
}

/**
 * User suspended event
 */
export interface UserSuspendedEvent extends BaseEvent {
  userId: string;
  reason: string;
  suspendedBy: string;
  suspendedUntil?: Date;
}

/**
 * User activated event
 */
export interface UserActivatedEvent extends BaseEvent {
  userId: string;
  activatedBy: string;
}
