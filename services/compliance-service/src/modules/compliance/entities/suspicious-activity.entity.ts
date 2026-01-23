import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SARStatus {
  DETECTED = 'detected',
  UNDER_REVIEW = 'under_review',
  REPORTED = 'reported',
  FALSE_POSITIVE = 'false_positive',
  DISMISSED = 'dismissed',
}

export enum SARType {
  STRUCTURING = 'structuring', // Breaking up transactions to avoid reporting
  RAPID_MOVEMENT = 'rapid_movement', // Quick in and out
  UNUSUAL_PATTERN = 'unusual_pattern',
  HIGH_RISK_JURISDICTION = 'high_risk_jurisdiction',
  BLACKLIST_INTERACTION = 'blacklist_interaction',
  WASH_TRADING = 'wash_trading',
  LAYERING = 'layering',
  MULTIPLE_ACCOUNTS = 'multiple_accounts',
  ABNORMAL_VOLUME = 'abnormal_volume',
}

@Entity('suspicious_activities')
export class SuspiciousActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index(['user_id'])
  userId!: string;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId!: string;

  @Index(['type'])
  @Column({
    type: 'enum',
    enum: SARType,
  })
  type!: SARType;

  @Index(['status'])
  @Column({
    type: 'enum',
    enum: SARStatus,
    default: SARStatus.DETECTED,
  })
  status!: SARStatus;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ name: 'risk_score', type: 'integer' })
  riskScore!: number;

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, any>;

  @Column({ name: 'transaction_amount', type: 'decimal', precision: 20, scale: 8, nullable: true })
  transactionAmount!: number;

  @Column({ name: 'transaction_currency', type: 'varchar', length: 10, nullable: true })
  transactionCurrency!: string;

  @Column({ name: 'related_addresses', type: 'text', array: true, nullable: true })
  relatedAddresses!: string[];

  @Column({ name: 'reported_to_authority', type: 'boolean', default: false })
  reportedToAuthority!: boolean;

  @Column({ name: 'reported_at', type: 'timestamp', nullable: true })
  reportedAt!: Date;

  @Column({ name: 'report_reference', type: 'varchar', length: 255, nullable: true })
  reportReference!: string;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy!: string;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt!: Date;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Index(['detected_at'])
  @Column({ name: 'detected_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  detectedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
