import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MiniGameType {
  PRICE_PREDICTION = 'price_prediction',
  QUIZ = 'quiz',
  SPIN_WHEEL = 'spin_wheel',
  TRADING_SIMULATOR = 'trading_simulator',
}

export enum GameStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('mini_games')
@Index(['userId', 'gameType', 'createdAt'])
export class MiniGame {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    name: 'game_type',
    type: 'enum',
    enum: MiniGameType,
  })
  gameType: MiniGameType;

  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.PENDING,
  })
  status: GameStatus;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ name: 'xp_earned', type: 'int', default: 0 })
  xpEarned: number;

  @Column({ name: 'tokens_earned', type: 'decimal', precision: 18, scale: 8, default: 0 })
  tokensEarned: number;

  @Column({ name: 'is_win', type: 'boolean', default: false })
  isWin: boolean;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
