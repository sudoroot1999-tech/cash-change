import { BaseEvent } from './base.event';

/**
 * KYC level type
 */
export type KycLevel = 0 | 1 | 2 | 3;

/**
 * KYC status
 */
export type KycStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';

/**
 * Document type
 */
export type DocumentType = 'passport' | 'id_card' | 'driver_license' | 'proof_of_address' | 'selfie';

/**
 * KYC submitted event
 */
export interface KycSubmittedEvent extends BaseEvent {
  userId: string;
  kycLevel: KycLevel;
  documents: Array<{
    type: DocumentType;
    url: string;
  }>;
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  };
}

/**
 * KYC under review event
 */
export interface KycUnderReviewEvent extends BaseEvent {
  userId: string;
  kycLevel: KycLevel;
  reviewStartedAt: Date;
  reviewedBy: string;
}

/**
 * KYC approved event
 */
export interface KycApprovedEvent extends BaseEvent {
  userId: string;
  kycLevel: KycLevel;
  approvedBy: string;
  approvedAt: Date;
  expiresAt?: Date;
}

/**
 * KYC rejected event
 */
export interface KycRejectedEvent extends BaseEvent {
  userId: string;
  kycLevel: KycLevel;
  reason: string;
  rejectedBy: string;
  rejectedAt: Date;
  canResubmit: boolean;
  resubmitAfter?: Date;
}

/**
 * KYC expired event
 */
export interface KycExpiredEvent extends BaseEvent {
  userId: string;
  kycLevel: KycLevel;
  expiredAt: Date;
}

/**
 * KYC document requested event
 */
export interface KycDocumentRequestedEvent extends BaseEvent {
  userId: string;
  kycLevel: KycLevel;
  documentType: DocumentType;
  requestedBy: string;
  reason?: string;
}

/**
 * KYC limit updated event
 */
export interface KycLimitUpdatedEvent extends BaseEvent {
  userId: string;
  kycLevel: KycLevel;
  limits: {
    dailyDeposit?: string;
    dailyWithdrawal?: string;
    monthlyDeposit?: string;
    monthlyWithdrawal?: string;
  };
}
