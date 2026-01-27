import { UserStatus, UserTier } from ".";

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  roles?: string[];
  permissions?: string[];
  sessionId: string;
  username: string;
  status: UserStatus;
  tier: UserTier;
  kycLevel: number;
  kycStatus?: string;
  isTwoFactorEnabled?: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  tier: string;
  kycLevel: number;
  username: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  isTwoFactorEnabled?: boolean;
  status: UserStatus;
  phone?: string | null;
  kycStatus?: string;
  feeTier?: string;
  referralCode: string;
  referredBy?: string | null;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  emailVerificationToken?: string | null;
  antiPhishingCode?: string | null;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Auth Types

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  sessionId: string;
}