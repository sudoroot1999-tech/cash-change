import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { KycDocument } from './kyc-document.entity';
import { KYC_LEVELS, KYC_PROVIDER, KYC_STATUS, KycLevel, KycProvider, KycStatus } from '@exchange/common';


@Entity('kyc_verification_requests')
export class KycVerificationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['user_id'])
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Index(['requested_level'])
  @Column({
    type: 'enum',
    enum: KYC_LEVELS,
    name: 'requested_level'
  })
  requestedLevel: KycLevel;

  @Index(['status'])
  @Column({
    type: 'enum',
    enum: KYC_STATUS,
    default: KYC_STATUS.PENDING,
  })
  status: KycStatus;

  @Column({
    type: 'enum',
    enum: KYC_PROVIDER,
    default: KYC_PROVIDER.MANUAL,
  })
  provider: KycProvider;

  @Column({ nullable: true, name: 'provider_request_id' })
  providerRequestId: string;

  @Column({ type: 'simple-array', default: '', name: 'document_ids' })
  documentIds: string[];

  // Selfie verification
  @Column({ nullable: true, name: 'selfie_url' })
  selfieUrl: string;

  @Column({ nullable: true, name: 'selfie_url_encrypted' })
  selfieUrlEncrypted: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'liveness_score' })
  livenessScore: number;

  // Video verification (Level 3)
  @Column({ nullable: true, name: 'video_url' })
  videoUrl: string;

  @Column({ nullable: true, name: 'video_url_encrypted' })
  videoUrlEncrypted: string;

  // Timestamps
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'submitted_at' })
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date;

  @Column({ nullable: true, name: 'reviewed_by' })
  reviewedBy: string;

  @Column({ type: 'timestamp', nullable: true, name: 'approved_at' })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'rejected_at' })
  rejectedAt: Date;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Additional metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ name: 'identity_verified', type: 'boolean', default: false })
  identityVerified!: boolean;

  @Column({ name: 'liveness_verified', type: 'boolean', default: false })
  livenessVerified!: boolean;

  @Column({ name: 'address_verified', type: 'boolean', default: false })
  addressVerified!: boolean;

  @Column({ name: 'document_authenticity_verified', type: 'boolean', default: false })
  documentAuthenticityVerified!: boolean;

  @Column({ name: 'provider_applicant_id', type: 'varchar', length: 255, nullable: true })
  providerApplicantId!: string;

  @Column({ name: 'verification_data', type: 'jsonb', nullable: true })
  verificationData!: Record<string, any>;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy!: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => KycDocument, (document) => document.verificationRequest)
  documents: KycDocument[];
}
