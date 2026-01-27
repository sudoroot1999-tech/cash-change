import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AirdropStatus {
  DRAFT = 'draft',
  SNAPSHOT_PENDING = 'snapshot_pending',
  SNAPSHOT_COMPLETED = 'snapshot_completed',
  CLAIMING_OPEN = 'claiming_open',
  CLAIMING_CLOSED = 'claiming_closed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum AirdropType {
  TOKEN_HOLDER = 'token_holder',
  TRADER = 'trader',
  EARLY_USER = 'early_user',
  CONTEST_WINNER = 'contest_winner',
  PROMOTIONAL = 'promotional',
  GOVERNANCE = 'governance',
}

@Entity('airdrop_campaigns')
@Index(['status'])
@Index(['snapshotDate'])
export class AirdropCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AirdropStatus,
    default: AirdropStatus.DRAFT,
  })
  status: AirdropStatus;

  @Column({
    type: 'enum',
    enum: AirdropType,
  })
  type: AirdropType;

  @Column({ type: 'varchar', length: 20 })
  tokenSymbol: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tokenContractAddress: string;

  @Column({ type: 'decimal', precision: 30, scale: 8 })
  totalAllocation: number;

  @Column({ type: 'decimal', precision: 30, scale: 8, default: 0 })
  totalClaimed: number;

  @Column({ type: 'decimal', precision: 30, scale: 8, default: 0 })
  totalDistributed: number;

  @Column({ type: 'integer', default: 0 })
  eligibleUsers: number;

  @Column({ type: 'integer', default: 0 })
  claimedUsers: number;

  @Column({ type: 'timestamp' })
  snapshotDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  snapshotCompletedAt: Date;

  @Column({ type: 'timestamp' })
  claimStartDate: Date;

  @Column({ type: 'timestamp' })
  claimEndDate: Date;

  // Eligibility criteria
  @Column({ type: 'jsonb' })
  eligibilityCriteria: {
    minTokenBalance?: number;
    minTradeVolume?: number;
    minTrades?: number;
    registrationBefore?: Date;
    kycRequired?: boolean;
    countries?: string[];
    excludeCountries?: string[];
    minAccountAge?: number;
    specificUsers?: string[];
    holdingPeriod?: number; // days
  };

  // Vesting configuration
  @Column({ type: 'boolean', default: false })
  hasVesting: boolean;

  @Column({ type: 'jsonb', nullable: true })
  vestingSchedule: {
    cliffPeriod?: number; // days
    vestingPeriod?: number; // days
    releaseSchedule?: Array<{
      percentage: number;
      daysFromStart: number;
    }>;
  };

  // Distribution formula
  @Column({ type: 'jsonb' })
  distributionFormula: {
    type: 'equal' | 'proportional' | 'tiered' | 'custom';
    tiers?: Array<{
      minValue: number;
      maxValue: number;
      allocation: number;
    }>;
    weights?: {
      tokenBalance?: number;
      tradeVolume?: number;
      accountAge?: number;
      referrals?: number;
    };
  };

  // Anti-Sybil measures
  @Column({ type: 'jsonb' })
  antiSybilMeasures: {
    maxPerIp?: number;
    maxPerDevice?: number;
    requireUniqueWallet?: boolean;
    minAccountAge?: number;
    requireActivity?: boolean;
    fraudScoreThreshold?: number;
  };

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  minClaimAmount: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  maxClaimAmount: number;

  @Column({ type: 'boolean', default: false })
  autoDistribute: boolean;

  @Column({ type: 'boolean', default: false })
  requiresClaim: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  claimPageUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
