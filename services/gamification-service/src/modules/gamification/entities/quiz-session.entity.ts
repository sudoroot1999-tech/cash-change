import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Quiz } from './quiz.entity';

export enum QuizSessionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  TIMEOUT = 'timeout',
}

@Entity('quiz_sessions')
@Index(['userId', 'createdAt'])
@Index(['quizId', 'status'])
export class QuizSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'quiz_id', type: 'uuid' })
  @Index()
  quizId: string;

  @ManyToOne(() => Quiz)
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @Column({
    type: 'enum',
    enum: QuizSessionStatus,
    default: QuizSessionStatus.IN_PROGRESS,
  })
  status: QuizSessionStatus;

  @Column({ type: 'jsonb' })
  answers: Record<string, any>; // { questionId: answerId }

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ name: 'correct_answers', type: 'int', default: 0 })
  correctAnswers: number;

  @Column({ name: 'total_questions', type: 'int' })
  totalQuestions: number;

  @Column({ name: 'time_taken', type: 'int', default: 0 }) // in seconds
  timeTaken: number;

  @Column({ name: 'xp_earned', type: 'int', default: 0 })
  xpEarned: number;

  @Column({ name: 'tokens_earned', type: 'decimal', precision: 18, scale: 8, default: 0 })
  tokensEarned: number;

  @Column({ name: 'is_passed', type: 'boolean', default: false })
  isPassed: boolean;

  @Column({ name: 'battle_id', type: 'uuid', nullable: true })
  battleId: string;

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
