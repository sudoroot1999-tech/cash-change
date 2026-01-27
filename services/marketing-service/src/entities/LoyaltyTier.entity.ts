import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TierLevel {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

@Entity('loyalty_tiers')
@Index(['level'], { unique: true })
export class LoyaltyTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TierLevel,
  })
  level: TierLevel;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'integer' })
  order: number; // 1 = lowest, 5 = highest

  @Column({ type: 'varchar', length: 10 })
  color: string; // Hex color

  @Column({ type: 'varchar', length: 255, nullable: true })
  iconUrl: string;

  // Requirements to achieve tier
  @Column({ type: 'jsonb' })
  requirements: {
    minPoints?: number;
    minTradeVolume?: number;
    minTrades?: number;
    minDeposit?: number;
    minAccountAge?: number;
    holdTokens?: { symbol: string; amount: number }[];
  };

  // Benefits
  @Column({ type: 'jsonb' })
  benefits: {
    pointsMultiplier: number; // e.g., 1.5x for Silver
    tradingFeeDiscount: number; // percentage
    withdrawalFeeDiscount: number; // percentage
    prioritySupport: boolean;
    dedicatedManager: boolean;
    earlyFeatureAccess: boolean;
    higherWithdrawalLimits: boolean;
    customLimits?: {
      dailyWithdrawal?: number;
      monthlyWithdrawal?: number;
    };
    exclusiveRewards: string[];
    birthdayBonus: number;
    anniversaryBonus: number;
    monthlyAirdrop?: number;
    freeAdvancedFeatures: string[];
  };

  @Column({ type: 'integer', default: 0 })
  currentMembers: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
