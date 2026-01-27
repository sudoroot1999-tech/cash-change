import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ReferralCampaign } from './ReferralCampaign.entity';

@Entity('referral_links')
@Index(['userId', 'campaignId'])
@Index(['referralCode'], { unique: true })
@Index(['shortCode'], { unique: true })
export class ReferralLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  campaignId: string;

  @ManyToOne(() => ReferralCampaign)
  @JoinColumn({ name: 'campaignId' })
  campaign: ReferralCampaign;

  @Column({ type: 'varchar', length: 50, unique: true })
  referralCode: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  shortCode: string;

  @Column({ type: 'text' })
  fullUrl: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  clicks: number;

  @Column({ type: 'integer', default: 0 })
  conversions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  conversionRate: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  totalEarnings: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  pendingEarnings: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  paidEarnings: number;

  @Column({ type: 'integer', default: 0 })
  activeReferrals: number;

  @Column({ type: 'jsonb', nullable: true })
  utmParameters: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  customParameters: Record<string, string>;

  @Column({ type: 'timestamp', nullable: true })
  lastClickAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastConversionAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
