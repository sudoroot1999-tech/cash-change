import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('affiliate_campaigns')
export class AffiliateCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  affiliateId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: 'draft' | 'active' | 'paused' | 'completed' | 'rejected';
  // AFFILIATE_CAMPAIGN_STATUS

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate: number;

  @Column({ type: 'jsonb', nullable: true })
  customCommissionRates: {
    tier1?: number;
    tier2?: number;
  };

  @Column({ type: 'varchar', length: 500, nullable: true })
  landingPageUrl: string;

  @Column({ type: 'text', nullable: true })
  trackingPixel: string;

  @Column({ type: 'jsonb', nullable: true })
  brandedMaterials: {
    logoUrl?: string;
    bannerUrls?: string[];
    copyText?: string[];
  };

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'int', default: 0 })
  clicks: number;

  @Column({ type: 'int', default: 0 })
  signups: number;

  @Column({ type: 'int', default: 0 })
  conversions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCommission: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate: number;

  @Column({ type: 'jsonb', nullable: true })
  targetAudience: {
    regions?: string[];
    demographics?: string;
    interests?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    approvedBy?: string;
    approvedAt?: string;
    rejectionReason?: string;
    notes?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
