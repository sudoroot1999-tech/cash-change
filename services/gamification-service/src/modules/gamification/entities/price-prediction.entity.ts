import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PredictionType {
  UP_DOWN = 'up_down',
  EXACT_RANGE = 'exact_range',
}

export enum PredictionDuration {
  FIVE_MIN = 5,
  FIFTEEN_MIN = 15,
  THIRTY_MIN = 30,
}

export enum PredictionDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

@Entity('price_predictions')
@Index(['userId', 'createdAt'])
@Index(['symbol', 'predictionTime'])
export class PricePrediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({
    name: 'prediction_type',
    type: 'enum',
    enum: PredictionType,
  })
  predictionType: PredictionType;

  @Column({
    type: 'int',
  })
  duration: number; // in minutes

  @Column({
    type: 'enum',
    enum: PredictionDifficulty,
  })
  difficulty: PredictionDifficulty;

  @Column({ name: 'start_price', type: 'decimal', precision: 18, scale: 8 })
  startPrice: number;

  @Column({ name: 'predicted_direction', type: 'varchar', length: 10, nullable: true })
  predictedDirection: string; // 'up' or 'down'

  @Column({ name: 'predicted_range_min', type: 'decimal', precision: 18, scale: 8, nullable: true })
  predictedRangeMin: number;

  @Column({ name: 'predicted_range_max', type: 'decimal', precision: 18, scale: 8, nullable: true })
  predictedRangeMax: number;

  @Column({ name: 'actual_price', type: 'decimal', precision: 18, scale: 8, nullable: true })
  actualPrice: number;

  @Column({ name: 'is_correct', type: 'boolean', nullable: true })
  isCorrect: boolean;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ name: 'xp_earned', type: 'int', default: 0 })
  xpEarned: number;

  @Column({ name: 'tokens_earned', type: 'decimal', precision: 18, scale: 8, default: 0 })
  tokensEarned: number;

  @Column({ name: 'streak_count', type: 'int', default: 0 })
  streakCount: number;

  @Column({ name: 'streak_bonus', type: 'int', default: 0 })
  streakBonus: number;

  @Column({ name: 'tournament_id', type: 'uuid', nullable: true })
  tournamentId: string;

  @Column({ name: 'prediction_time', type: 'timestamp' })
  predictionTime: Date;

  @Column({ name: 'settlement_time', type: 'timestamp' })
  settlementTime: Date;

  @Column({ name: 'settled_at', type: 'timestamp', nullable: true })
  settledAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
