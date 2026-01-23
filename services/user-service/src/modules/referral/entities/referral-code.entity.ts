import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ReferralRelationship } from './referral-relationship.entity';

@Entity('referral_codes')
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 20, default: 'standard' })
  type: 'standard' | 'affiliate' | 'vip';

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 20, name: 'commission_rate' })
  commissionRate: number;

  @Column({ type: 'int', default: 0, name: 'usage_count' })
  usageCount: number;

  @Column({ type: 'int', nullable: true, name: 'max_usage_limit' })
  maxUsageLimit: number;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    campaignId?: string;
    landingPageUrl?: string;
    trackingPixel?: string;
    customCommissionRates?: {
      tier1?: number;
      tier2?: number;
    };
  };

  @OneToMany(() => ReferralRelationship, (relationship) => relationship.referralCode)
  relationships: ReferralRelationship[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
