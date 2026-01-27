import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum PointsTransactionType {
  EARNED = 'earned',
  REDEEMED = 'redeemed',
  EXPIRED = 'expired',
  BONUS = 'bonus',
  ADJUSTMENT = 'adjustment',
  REFUND = 'refund',
}

export enum PointsSource {
  TRADE = 'trade',
  DEPOSIT = 'deposit',
  REFERRAL = 'referral',
  SIGNUP_BONUS = 'signup_bonus',
  BIRTHDAY = 'birthday',
  ANNIVERSARY = 'anniversary',
  PROMOTION = 'promotion',
  CONTEST = 'contest',
  STREAK = 'streak',
  ACHIEVEMENT = 'achievement',
  ADMIN = 'admin',
  REDEMPTION = 'redemption',
}

@Entity('loyalty_transactions')
@Index(['userId', 'createdAt'])
@Index(['type', 'source'])
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: PointsTransactionType,
  })
  type: PointsTransactionType;

  @Column({
    type: 'enum',
    enum: PointsSource,
  })
  source: PointsSource;

  @Column({ type: 'bigint' })
  points: number;

  @Column({ type: 'bigint' })
  balanceAfter: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  multiplier: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceId: string; // Trade ID, deposit ID, etc.

  @Column({ type: 'varchar', length: 50, nullable: true })
  referenceType: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  isExpired: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
