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
import { LoyaltyTier, TierLevel } from './LoyaltyTier.entity';

@Entity('user_loyalty')
@Index(['userId'], { unique: true })
@Index(['currentTier'])
export class UserLoyalty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: TierLevel,
    default: TierLevel.BRONZE,
  })
  currentTier: TierLevel;

  @Column({ type: 'uuid' })
  currentTierId: string;

  @ManyToOne(() => LoyaltyTier)
  @JoinColumn({ name: 'currentTierId' })
  tier: LoyaltyTier;

  @Column({ type: 'bigint', default: 0 })
  totalPoints: number;

  @Column({ type: 'bigint', default: 0 })
  availablePoints: number;

  @Column({ type: 'bigint', default: 0 })
  redeemedPoints: number;

  @Column({ type: 'bigint', default: 0 })
  expiredPoints: number;

  @Column({ type: 'decimal', precision: 30, scale: 2, default: 0 })
  lifetimeTradeVolume: number;

  @Column({ type: 'integer', default: 0 })
  lifetimeTrades: number;

  @Column({ type: 'decimal', precision: 30, scale: 2, default: 0 })
  lifetimeDeposits: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  pointsMultiplier: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  tradingFeeDiscount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  withdrawalFeeDiscount: number;

  @Column({ type: 'timestamp', nullable: true })
  tierAchievedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextTierEligibleAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  progressToNextTier: {
    nextTier: TierLevel;
    pointsNeeded: number;
    volumeNeeded: number;
    tradesNeeded: number;
    progressPercentage: number;
  };

  // Birthday and anniversary tracking
  @Column({ type: 'date', nullable: true })
  birthday: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastBirthdayRewardAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  accountAnniversary: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastAnniversaryRewardAt: Date;

  // Streak tracking
  @Column({ type: 'integer', default: 0 })
  currentLoginStreak: number;

  @Column({ type: 'integer', default: 0 })
  longestLoginStreak: number;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginDate: Date;

  @Column({ type: 'integer', default: 0 })
  currentTradingStreak: number;

  @Column({ type: 'timestamp', nullable: true })
  lastTradeDate: Date;

  // Tier history
  @Column({ type: 'jsonb', default: [] })
  tierHistory: Array<{
    tier: TierLevel;
    achievedAt: Date;
    leftAt?: Date;
  }>;

  // Special statuses
  @Column({ type: 'boolean', default: false })
  isVip: boolean;

  @Column({ type: 'boolean', default: false })
  hasDedicatedManager: boolean;

  @Column({ type: 'boolean', default: false })
  hasEarlyAccess: boolean;

  @Column({ type: 'jsonb', nullable: true })
  specialBenefits: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
