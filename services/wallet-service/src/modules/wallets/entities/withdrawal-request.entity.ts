import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum WithdrawalRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('withdrawal_requests')
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
export class WithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'wallet_id' })
  walletId: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({ name: 'to_address', type: 'varchar', length: 255 })
  toAddress: string;

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @Column({ name: 'required_approvals', type: 'int', default: 1 })
  requiredApprovals: number;

  @Column({ name: 'current_approvals', type: 'int', default: 0 })
  currentApprovals: number;

  @Column({ type: 'jsonb', default: '[]' })
  approvals: Array<{
    userId: string;
    timestamp: Date;
    comment?: string;
  }>;

  @Column({
    type: 'enum',
    enum: WithdrawalRiskLevel,
    default: WithdrawalRiskLevel.LOW,
  })
  riskLevel: WithdrawalRiskLevel;

  @Column({ name: 'risk_score', type: 'decimal', precision: 5, scale: 2, default: '0' })
  riskScore: string;

  @Column({ name: 'risk_factors', type: 'jsonb', nullable: true })
  riskFactors: string[];

  @Column({ name: 'is_whitelisted', type: 'boolean', default: false })
  isWhitelisted: boolean;

  @Column({ name: 'time_lock_until', type: 'timestamp', nullable: true })
  timeLockUntil: Date;

  @Column({ name: 'two_factor_verified', type: 'boolean', default: false })
  twoFactorVerified: boolean;

  @Column({ name: 'transaction_id', type: 'varchar', length: 255, nullable: true })
  transactionId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date;
}
