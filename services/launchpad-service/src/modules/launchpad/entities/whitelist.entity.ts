import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WhitelistStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

@Entity('whitelists')
@Index(['userId', 'saleRoundId'], { unique: true })
export class Whitelist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'uuid' })
  @Index()
  saleRoundId!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({
    type: 'enum',
    enum: WhitelistStatus,
    default: WhitelistStatus.PENDING,
  })
  status!: WhitelistStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  walletAddress?: string;

  @Column({ type: 'boolean', default: false })
  kycCompleted!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  kycCompletedAt?: Date;

  @Column({ type: 'boolean', default: false })
  stakingRequirementMet!: boolean;

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  stakingAmount?: string;

  @Column({ type: 'int', default: 1 })
  userTier!: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  maxAllocation?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  country?: string;

  @Column({ type: 'boolean', default: true })
  isEligible!: boolean;

  @Column({ type: 'text', nullable: true })
  ineligibilityReason?: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    referralCode?: string;
    applicationAnswers?: Record<string, any>;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
