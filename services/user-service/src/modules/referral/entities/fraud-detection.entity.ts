import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('fraud_detections')
export class FraudDetection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['user_id'])
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId: string;

  @Index(['referral_relationship_id'])
  @Column({ type: 'uuid', nullable: true, name: 'referral_relationship_id' })
  referralRelationshipId: string;

  @Column({ type: 'varchar', length: 50, name: 'fraud_type' })
  fraudType:
    | 'fake_signup'
    | 'self_referral'
    | 'ip_abuse'
    | 'device_abuse'
    | 'velocity_abuse'
    | 'suspicious_pattern'
    | 'bot_activity'
    | 'duplicate_account';

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'flagged' })
  status: 'flagged' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved';

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'risk_score' })
  riskScore: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'jsonb' })
  evidence: {
    ipAddress?: string;
    deviceFingerprint?: string;
    patterns?: string[];
    relatedUserIds?: string[];
    timingData?: {
      signupInterval?: number;
      actionSpeed?: number;
    };
    behavioralData?: {
      mouseMovements?: boolean;
      typingSpeed?: number;
      browserAutomation?: boolean;
    };
  };

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  action: 'pending' | 'suspend_account' | 'block_commissions' | 'require_verification' | 'none';

  @Column({ type: 'boolean', default: false, name: 'is_resolved' })
  isResolved: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedBy: string;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date;

  @Column({ type: 'text', nullable: true, name: 'review_notes' })
  reviewNotes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    autoDetected?: boolean;
    detectionSource?: string;
    confidence?: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
