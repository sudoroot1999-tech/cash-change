import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('bonus_campaigns')
export class BonusCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  type: 'signup' | 'first_trade' | 'volume_based' | 'limited_time' | 'referrer_bonus';

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'draft' | 'active' | 'paused' | 'completed';

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'bonus_amount' })
  bonusAmount: number;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'bonus_type' })
  bonusType: 'fixed' | 'percentage';

  @Column({ type: 'timestamp', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'timestamp', name: 'end_date' })
  endDate: Date;

  @Column({ type: 'int', nullable: true, name: 'max_redemptions' })
  maxRedemptions: number;

  @Column({ type: 'int', default: 0, name: 'current_redemptions' })
  currentRedemptions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'min_trading_volume' })
  minTradingVolume: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'max_bonus_per_user' })
  maxBonusPerUser: number;

  @Column({ type: 'jsonb', nullable: true, name: 'eligibility_criteria' })
  eligibilityCriteria: {
    kycRequired?: boolean;
    minAccountAge?: number;
    eligibleCountries?: string[];
    excludedCountries?: string[];
    userTiers?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  conditions: {
    minDepositAmount?: number;
    tradingPairs?: string[];
    holdingPeriod?: number;
    wagerRequirement?: number;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_distributed' })
  totalDistributed: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    termsUrl?: string;
    imageUrl?: string;
    priority?: number;
    tags?: string[];
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
