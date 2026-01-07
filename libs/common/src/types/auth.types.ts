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
  userId: string;
  email: string;
  tier: string;
  kycLevel: number;
  username: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  isTwoFactorEnabled?: boolean;
  status: UserStatus;
}

// Auth Types

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}