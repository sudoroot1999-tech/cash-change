import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ReferralCode } from './referral-code.entity';
import { ReferralCommission } from './referral-commission.entity';

@Entity('referral_relationships')
export class ReferralRelationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['referrer_id'])
  @Column({ type: 'uuid', name: 'referrer_id' })
  referrerId: string;

  @Index(['referee_id'])
  @Column({ type: 'uuid', name: 'referee_id' })
  refereeId: string;

  @Index()
  @Column({ type: 'uuid', name: 'referral_code_id' })
  referralCodeId: string;

  @ManyToOne(() => ReferralCode, (code) => code.relationships)
  @JoinColumn({ name: 'referral_code_id' })
  referralCode: ReferralCode;

  @Column({ type: 'int', default: 1 })
  tier: number; // 1 for direct referral, 2 for indirect

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'suspended' | 'terminated';
  // REFERRAL_RELATIONSHIP_STATUS
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_commission_earned' })
  totalCommissionEarned: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_trading_volume' })
  totalTradingVolume: number;

  @Column({ type: 'int', default: 0, name: 'total_trades' })
  totalTrades: number;

  @Column({ type: 'boolean', default: false, name: 'has_completed_first_trade' })
  hasCompletedFirstTrade: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'first_trade_at' })
  firstTradeAt: Date;

  @Column({ type: 'boolean', default: false, name: 'signup_bonus_paid' })
  signupBonusPaid: boolean;

  @Column({ type: 'boolean', default: false, name: 'first_trade_bonus_paid' })
  firstTradeBonusPaid: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    ipAddress?: string;
    deviceFingerprint?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };

  @OneToMany(() => ReferralCommission, (commission) => commission.relationship)
  commissions: ReferralCommission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
