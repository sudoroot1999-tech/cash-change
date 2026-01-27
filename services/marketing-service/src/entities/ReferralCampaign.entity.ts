import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum ReferralCampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended',
}

export enum CommissionType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  TIERED = 'tiered',
}

@Entity('referral_campaigns')
export class ReferralCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReferralCampaignStatus,
    default: ReferralCampaignStatus.DRAFT,
  })
  status: ReferralCampaignStatus;

  @Column({
    type: 'enum',
    enum: CommissionType,
    default: CommissionType.PERCENTAGE,
  })
  commissionType: CommissionType;

  // Commission structure (JSON)
  @Column({ type: 'jsonb', nullable: true })
  commissionStructure: {
    tier1: { percentage?: number; fixed?: number; minVolume?: number };
    tier2?: { percentage?: number; fixed?: number; minVolume?: number };
    tier3?: { percentage?: number; fixed?: number; minVolume?: number };
    tier4?: { percentage?: number; fixed?: number; minVolume?: number };
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  defaultCommissionRate: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  maxCommissionPerUser: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  maxTotalCommission: number;

  @Column({ type: 'integer', nullable: true })
  maxReferralsPerUser: number;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  eligibilityCriteria: {
    minAccountAge?: number;
    minTradeVolume?: number;
    kycRequired?: boolean;
    countries?: string[];
  };

  @Column({ type: 'boolean', default: true })
  allowCustomCodes: boolean;

  @Column({ type: 'boolean', default: true })
  trackSubReferrals: boolean; // Multi-level marketing

  @Column({ type: 'jsonb', nullable: true })
  socialSharingConfig: {
    twitter?: boolean;
    telegram?: boolean;
    facebook?: boolean;
    whatsapp?: boolean;
    shareText?: string;
  };

  @Column({ type: 'boolean', default: false })
  isContest: boolean;

  @Column({ type: 'jsonb', nullable: true })
  contestConfig: {
    prizes?: Array<{ rank: number; reward: number; currency: string }>;
    leaderboardSize?: number;
    contestEndDate?: Date;
  };

  @Column({ type: 'integer', default: 0 })
  totalReferrals: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  totalCommissionPaid: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
