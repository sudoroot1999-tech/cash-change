import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('campaign_performance')
@Index(['campaignId', 'date'])
@Index(['channel', 'date'])
export class CampaignPerformance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  campaignId: string;

  @Column({ type: 'varchar', length: 100 })
  campaignName: string;

  @Column({ type: 'varchar', length: 50 })
  campaignType: string; // email, push, referral, affiliate, etc.

  @Column({ type: 'varchar', length: 100 })
  channel: string;

  @Column({ type: 'date' })
  date: Date;

  // Reach metrics
  @Column({ type: 'integer', default: 0 })
  impressions: number;

  @Column({ type: 'integer', default: 0 })
  reach: number;

  @Column({ type: 'integer', default: 0 })
  clicks: number;

  @Column({ type: 'integer', default: 0 })
  uniqueClicks: number;

  // Engagement metrics
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  clickThroughRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  averageTimeSpent: number;

  @Column({ type: 'integer', default: 0 })
  bounces: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  bounceRate: number;

  // Conversion metrics
  @Column({ type: 'integer', default: 0 })
  conversions: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  revenue: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  averageOrderValue: number;

  // Cost metrics
  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  costPerClick: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  costPerAcquisition: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  returnOnAdSpend: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  returnOnInvestment: number;

  // Retention metrics
  @Column({ type: 'integer', default: 0 })
  newUsers: number;

  @Column({ type: 'integer', default: 0 })
  returningUsers: number;

  @Column({ type: 'integer', default: 0 })
  churnedUsers: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  retentionRate: number;

  // Channel-specific metrics
  @Column({ type: 'jsonb', nullable: true })
  channelMetrics: {
    // Email specific
    delivered?: number;
    opened?: number;
    openRate?: number;
    unsubscribed?: number;
    complaints?: number;
    
    // Push specific
    dismissed?: number;
    
    // Social specific
    shares?: number;
    likes?: number;
    comments?: number;
    
    // Referral specific
    referrals?: number;
    qualifiedReferrals?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
