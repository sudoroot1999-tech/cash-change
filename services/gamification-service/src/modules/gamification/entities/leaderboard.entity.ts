import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum LeaderboardType {
  OVERALL_XP = 'overall_xp',
  WEEKLY_XP = 'weekly_xp',
  MONTHLY_XP = 'monthly_xp',
  PRICE_PREDICTION = 'price_prediction',
  TRADING_SIMULATOR = 'trading_simulator',
  QUIZ = 'quiz',
  GUILD = 'guild',
  PET_BATTLE = 'pet_battle',
}

export enum LeaderboardPeriod {
  ALL_TIME = 'all_time',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('leaderboards')
@Index(['type', 'period', 'periodStart'])
@Index(['userId', 'type', 'period'])
export class Leaderboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: LeaderboardType,
  })
  type: LeaderboardType;

  @Column({
    type: 'enum',
    enum: LeaderboardPeriod,
  })
  period: LeaderboardPeriod;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId: string;

  @Column({ name: 'guild_id', type: 'uuid', nullable: true })
  @Index()
  guildId: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int' })
  rank: number;

  @Column({ name: 'previous_rank', type: 'int', nullable: true })
  previousRank: number;

  @Column({ name: 'rank_change', type: 'int', default: 0 })
  rankChange: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'period_start', type: 'timestamp' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamp' })
  periodEnd: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
