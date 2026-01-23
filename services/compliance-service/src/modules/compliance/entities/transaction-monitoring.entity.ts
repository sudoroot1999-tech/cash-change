import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MonitoringStatus {
  CLEAR = 'clear',
  FLAGGED = 'flagged',
  BLOCKED = 'blocked',
  UNDER_REVIEW = 'under_review',
}

@Entity('transaction_monitoring')
export class TransactionMonitoring {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  @Index(['transaction_id'])
  transactionId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index(['user_id'])
  userId!: string;

  @Column({ name: 'transaction_type', type: 'varchar', length: 50 })
  transactionType!: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  amount!: number;

  @Column({ type: 'varchar', length: 10 })
  currency!: string;

  @Index(['status'])
  @Column({
    type: 'enum',
    enum: MonitoringStatus,
    default: MonitoringStatus.CLEAR,
  })
  status!: MonitoringStatus;

  @Column({ name: 'risk_score', type: 'integer', default: 0 })
  riskScore!: number;

  @Column({ type: 'text', array: true, nullable: true })
  flags!: string[] | null;

  @Column({ name: 'from_address', type: 'varchar', length: 255, nullable: true })
  fromAddress!: string | null;

  @Column({ name: 'to_address', type: 'varchar', length: 255, nullable: true })
  toAddress!: string | null;

  @Column({ name: 'blockchain_hash', type: 'varchar', length: 255, nullable: true })
  blockchainHash!: string | null;

  @Column({ name: 'chainalysis_result', type: 'jsonb', nullable: true })
  chainalysisResult!: Record<string, any> | null;

  @Column({ name: 'is_high_value', type: 'boolean', default: false })
  isHighValue!: boolean;

  @Column({ name: 'is_ctr_reportable', type: 'boolean', default: false })
  isCtrReportable!: boolean; // Currency Transaction Report

  @Column({ name: 'is_travel_rule', type: 'boolean', default: false })
  isTravelRule!: boolean;

  @Column({ name: 'travel_rule_data', type: 'jsonb', nullable: true })
  travelRuleData!: Record<string, any> | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Index(['created_at'])
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
