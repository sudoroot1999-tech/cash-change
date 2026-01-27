import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReferralRelationship } from './referral-relationship.entity';

@Entity('referral_commissions')
export class ReferralCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['referrer_id'])
  @Column({ type: 'uuid', name: 'referrer_id' })
  referrerId: string;

  @Index(['referee_id'])
  @Column({ type: 'uuid', name: 'referee_id' })
  refereeId: string;

  @Index(['relationship_id'])
  @Column({ type: 'uuid', name: 'relationship_id' })
  relationshipId: string;

  @ManyToOne(() => ReferralRelationship, (relationship) => relationship.commissions)
  @JoinColumn({ name: 'relationship_id' })
  relationship: ReferralRelationship;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'trade_id' })
  tradeId: string;

  @Column({ type: 'varchar', length: 50 })
  type: 'trading_fee' | 'signup_bonus' | 'first_trade_bonus' | 'volume_bonus' | 'campaign_bonus';
  // REFERRAL_COMMISSION_TYPE
  @Column({ type: 'int', default: 1 })
  tier: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'trading_fee' })
  tradingFee: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'commission_rate' })
  commissionRate: number;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  // REFERRAL_COMMISSION_STATUS
  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'payout_id' })
  payoutId: string;

  @Column({ type: 'timestamp', nullable: true, name: 'approved_at' })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
  paidAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    tradingPair?: string;
    orderType?: string;
    campaignId?: string;
    notes?: string;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
