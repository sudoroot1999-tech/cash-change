import { LoginStatus } from ".";

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  refreshToken?: string | null;
  deviceFingerprint?: string | null;
  ipAddress: string;
  userAgent?: string | null;
  metadata?: {
    browser?: string;
    os?: string;
    device?: string;
    location?: string;
  } | null;
  isActive: boolean;
  expiresAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrustedDevice {
  id: string;
  userId: string;
  deviceName?: string | null;
  fingerprint: string;
  metadata?: {
    browser?: string;
    os?: string;
    device?: string;
    screenResolution?: string;
    timezone?: string;
    language?: string;
  } | null;
  ipAddress?: string | null;
  location?: string | null;
  countryCode?: string | null;
  city?: string | null;
  isTrusted: boolean;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTwoFactor {
  id: string;
  userId: string;
  secret: string;
  backupCodes: string[];
  isEnabled: boolean;
  lastVerifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}


export interface LoginHistory {
  id: string;
  userId: string;
  status: LoginStatus;
  ipAddress: string;
  location?: string | null;
  countryCode?: string | null;
  city?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  deviceFingerprint?: string | null;
  userAgent?: string | null;
  metadata?: {
    browser?: string;
    os?: string;
    device?: string;
    isTrustedDevice?: boolean;
    isNewDevice?: boolean;
  } | null;
  failureReason?: string | null;
  createdAt: Date;
}

export interface AntiPhishingCode {
  id: string;
  userId: string;
  phishingCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}