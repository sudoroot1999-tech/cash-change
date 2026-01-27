import { UserStatus, UserTier } from ".";

// User Types

export interface User {
  id: string;
  email: string;
  username: string;
  phone?: string | null;
  status: UserStatus;
  tier: UserTier;
  kycLevel: number;
  kycStatus?: string;
  feeTier?: string;
  referralCode: string;
  referredBy?: string | null;
  twoFactorEnabled: boolean;
  isTwoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  emailVerificationToken?: string | null;
  antiPhishingCode?: string | null;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  country?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt?: Date,
  updatedAt?: Date
}