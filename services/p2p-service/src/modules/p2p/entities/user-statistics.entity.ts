import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_statistics')
@Index(['userId'])
export class UserStatistics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  @Index()
  userId: string;

  @Column({
    name: 'total_trades',
    type: 'int',
    default: 0,
  })
  totalTrades: number;

  @Column({
    name: 'completed_trades',
    type: 'int',
    default: 0,
  })
  completedTrades: number;

  @Column({
    name: 'cancelled_trades',
    type: 'int',
    default: 0,
  })
  cancelledTrades: number;

  @Column({
    name: 'disputed_trades',
    type: 'int',
    default: 0,
  })
  disputedTrades: number;

  @Column({
    name: 'total_volume',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  totalVolume: number;

  @Column({
    name: 'positive_ratings',
    type: 'int',
    default: 0,
  })
  positiveRatings: number;

  @Column({
    name: 'neutral_ratings',
    type: 'int',
    default: 0,
  })
  neutralRatings: number;

  @Column({
    name: 'negative_ratings',
    type: 'int',
    default: 0,
  })
  negativeRatings: number;

  @Column({
    name: 'average_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  averageRating: number;

  @Column({
    name: 'completion_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  completionRate: number;

  @Column({
    name: 'average_release_time',
    type: 'int',
    default: 0,
    comment: 'Average time in minutes to release crypto',
  })
  averageReleaseTime: number;

  @Column({
    name: 'last_trade_at',
    type: 'timestamp',
    nullable: true,
  })
  lastTradeAt: Date;

  @Column({
    name: 'is_trusted',
    type: 'boolean',
    default: false,
  })
  isTrusted: boolean;

  @Column({
    name: 'trust_score',
    type: 'int',
    default: 0,
  })
  trustScore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
