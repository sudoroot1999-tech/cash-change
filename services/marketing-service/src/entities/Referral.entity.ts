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
import { ReferralLink } from './ReferralLink.entity';

export enum ReferralStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  QUALIFIED = 'qualified',
  EXPIRED = 'expired',
  FRAUDULENT = 'fraudulent',
}

@Entity('referrals')
@Index(['referrerId', 'referredUserId'])
@Index(['referralLinkId'])
@Index(['status'])
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  referrerId: string; // User who referred

  @Column({ type: 'uuid' })
  referredUserId: string; // User who was referred

  @Column({ type: 'uuid' })
  referralLinkId: string;

  @ManyToOne(() => ReferralLink)
  @JoinColumn({ name: 'referralLinkId' })
  referralLink: ReferralLink;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  referralCode: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  clickData: {
    referrer?: string;
    landingPage?: string;
    device?: string;
    browser?: string;
    os?: string;
    country?: string;
    city?: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  clickedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  registeredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  qualifiedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  qualificationCriteria: {
    minDeposit?: number;
    minTrades?: number;
    kycCompleted?: boolean;
    emailVerified?: boolean;
  };

  @Column({ type: 'boolean', default: false })
  qualificationMet: boolean;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  totalTradeVolume: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  totalCommissionGenerated: number;

  @Column({ type: 'integer', default: 0 })
  tier: number; // For multi-level marketing

  @Column({ type: 'uuid', nullable: true })
  parentReferralId: string; // For tracking sub-referrals

  @Column({ type: 'jsonb', nullable: true })
  fraudChecks: {
    ipDuplicate?: boolean;
    deviceDuplicate?: boolean;
    rapidSignup?: boolean;
    suspiciousActivity?: boolean;
    fraudScore?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
