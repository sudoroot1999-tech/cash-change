import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AirdropCampaign } from './AirdropCampaign.entity';

export enum AllocationStatus {
  PENDING = 'pending',
  ELIGIBLE = 'eligible',
  CLAIMED = 'claimed',
  DISTRIBUTED = 'distributed',
  VESTING = 'vesting',
  EXPIRED = 'expired',
  REJECTED = 'rejected',
}

@Entity('airdrop_allocations')
@Index(['campaignId', 'userId'], { unique: true })
@Index(['userId', 'status'])
@Index(['status'])
export class AirdropAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campaignId: string;

  @ManyToOne(() => AirdropCampaign)
  @JoinColumn({ name: 'campaignId' })
  campaign: AirdropCampaign;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: AllocationStatus,
    default: AllocationStatus.PENDING,
  })
  status: AllocationStatus;

  @Column({ type: 'decimal', precision: 30, scale: 8 })
  allocatedAmount: number;

  @Column({ type: 'decimal', precision: 30, scale: 8, default: 0 })
  claimedAmount: number;

  @Column({ type: 'decimal', precision: 30, scale: 8, default: 0 })
  vestedAmount: number;

  @Column({ type: 'decimal', precision: 30, scale: 8, default: 0 })
  remainingAmount: number;

  // Snapshot data used for allocation
  @Column({ type: 'jsonb', nullable: true })
  snapshotData: {
    tokenBalance?: number;
    tradeVolume?: number;
    tradesCount?: number;
    accountAge?: number;
    referrals?: number;
    score?: number;
  };

  @Column({ type: 'timestamp', nullable: true })
  eligibleAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  fullyVestedAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  claimTransactionHash: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  walletAddress: string;

  // Vesting tracking
  @Column({ type: 'jsonb', nullable: true })
  vestingReleases: Array<{
    releaseDate: Date;
    amount: number;
    released: boolean;
    transactionHash?: string;
  }>;

  @Column({ type: 'timestamp', nullable: true })
  nextVestingDate: Date;

  // Fraud prevention
  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceFingerprint: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  fraudScore: number;

  @Column({ type: 'boolean', default: false })
  isSuspicious: boolean;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
