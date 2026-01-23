import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('referral_analytics')
export class ReferralAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Index({ unique: true })
  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int', default: 0, name: 'new_referrals' })
  newReferrals: number;

  @Column({ type: 'int', default: 0, name: 'active_referrals' })
  activeReferrals: number;

  @Column({ type: 'int', default: 0, name: 'total_referrals' })
  totalReferrals: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'daily_commissions' })
  dailyCommissions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_commissions' })
  totalCommissions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'trading_volume' })
  tradingVolume: number;

  @Column({ type: 'int', default: 0, name: 'total_trades' })
  totalTrades: number;

  @Column({ type: 'int', default: 0 })
  clicks: number;

  @Column({ type: 'int', default: 0 })
  conversions: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'conversion_rate' })
  conversionRate: number;

  @Column({ type: 'jsonb', nullable: true, name: 'tier_breakdown' })
  tierBreakdown: {
    tier1: {
      count: number;
      commissions: number;
      volume: number;
    };
    tier2: {
      count: number;
      commissions: number;
      volume: number;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    topReferral?: {
      userId: string;
      commissions: number;
    };
    avgCommissionPerReferral?: number;
    avgVolumePerReferral?: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
