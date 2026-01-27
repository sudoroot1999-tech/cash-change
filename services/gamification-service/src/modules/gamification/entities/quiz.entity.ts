import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum QuizDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

export enum QuizCategory {
  BLOCKCHAIN = 'blockchain',
  TRADING = 'trading',
  DEFI = 'defi',
  NFT = 'nft',
  SECURITY = 'security',
  GENERAL = 'general',
}

@Entity('quizzes')
@Index(['category', 'difficulty'])
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: QuizCategory,
  })
  category: QuizCategory;

  @Column({
    type: 'enum',
    enum: QuizDifficulty,
  })
  difficulty: QuizDifficulty;

  @Column({ type: 'jsonb' })
  questions: Record<string, any>[]; // Array of questions with options and correct answer

  @Column({ name: 'time_limit', type: 'int' }) // in seconds
  timeLimit: number;

  @Column({ name: 'passing_score', type: 'int', default: 70 })
  passingScore: number;

  @Column({ name: 'xp_reward', type: 'int' })
  xpReward: number;

  @Column({ name: 'token_reward', type: 'decimal', precision: 18, scale: 8, default: 0 })
  tokenReward: number;

  @Column({ name: 'is_daily', type: 'boolean', default: false })
  isDaily: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'play_count', type: 'int', default: 0 })
  playCount: number;

  @Column({ name: 'avg_score', type: 'decimal', precision: 10, scale: 4, default: 0 })
  avgScore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
