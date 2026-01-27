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
import { AffiliateProgram } from './AffiliateProgram.entity';

export enum AffiliateStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

@Entity('affiliates')
@Index(['userId'], { unique: true })
@Index(['status'])
@Index(['programId', 'status'])
export class Affiliate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column({ type: 'uuid' })
  programId: string;

  @ManyToOne(() => AffiliateProgram)
  @JoinColumn({ name: 'programId' })
  program: AffiliateProgram;

  @Column({
    type: 'enum',
    enum: AffiliateStatus,
    default: AffiliateStatus.PENDING,
  })
  status: AffiliateStatus;

  @Column({ type: 'varchar', length: 50, unique: true })
  affiliateCode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  socialMedia: {
    twitter?: string;
    telegram?: string;
    youtube?: string;
    instagram?: string;
    facebook?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  trafficSources: {
    website?: number;
    socialMedia?: number;
    email?: number;
    paid?: number;
    other?: number;
  };

  @Column({ type: 'integer', nullable: true })
  estimatedMonthlyTraffic: number;

  // Current tier
  @Column({ type: 'varchar', length: 100, default: 'default' })
  currentTier: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  currentCommissionRate: number;

  // Performance metrics
  @Column({ type: 'integer', default: 0 })
  totalClicks: number;

  @Column({ type: 'integer', default: 0 })
  totalConversions: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate: number;

  @Column({ type: 'decimal', precision: 30, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'decimal', precision: 30, scale: 2, default: 0 })
  totalEarnings: number;

  @Column({ type: 'decimal', precision: 30, scale: 2, default: 0 })
  pendingEarnings: number;

  @Column({ type: 'decimal', precision: 30, scale: 2, default: 0 })
  paidEarnings: number;

  @Column({ type: 'decimal', precision: 30, scale: 2, default: 0 })
  currentMonthRevenue: number;

  @Column({ type: 'decimal', precision: 30, scale: 2, default: 0 })
  lastMonthRevenue: number;

  // Payout information
  @Column({ type: 'jsonb', nullable: true })
  payoutDetails: {
    method?: string;
    walletAddress?: string;
    bankAccount?: {
      accountNumber?: string;
      routingNumber?: string;
      bankName?: string;
    };
    paypalEmail?: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  lastPayoutAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextPayoutAt: Date;

  // Custom landing pages
  @Column({ type: 'jsonb', default: [] })
  landingPages: Array<{
    id: string;
    name: string;
    url: string;
    isActive: boolean;
  }>;

  // Tracking pixel
  @Column({ type: 'text', nullable: true })
  trackingPixel: string;

  @Column({ type: 'boolean', default: false })
  hasApiAccess: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  apiKey: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
