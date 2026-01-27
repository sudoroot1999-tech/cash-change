import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { Quiz } from './quiz.entity';

@ObjectType()
export class QuizAnswer {
  @Field()
  questionId: string;

  @Field(() => [String])
  answer: string[];

  @Field()
  isCorrect: boolean;

  @Field(() => Int)
  pointsEarned: number;
}

@ObjectType()
@Entity('quiz_attempts')
@Index(['userId', 'quizId', 'attemptNumber'])
@Index(['userId', 'courseId'])
export class QuizAttempt {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  userId: string;

  @Field()
  @Column('uuid')
  quizId: string;

  @Field()
  @Column('uuid')
  courseId: string;

  @Field({ nullable: true })
  @Column('uuid', { nullable: true })
  lessonId?: string;

  @Field(() => Int)
  @Column()
  attemptNumber: number;

  @Field(() => [QuizAnswer])
  @Column('jsonb', { default: [] })
  answers: QuizAnswer[];

  @Field(() => Int)
  @Column()
  score: number;

  @Field(() => Int)
  @Column()
  maxScore: number;

  @Field(() => Float)
  @Column('decimal', { precision: 5, scale: 2 })
  percentage: number;

  @Field()
  @Column()
  passed: boolean;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  timeSpent?: number;

  @Field()
  @Column()
  startedAt: Date;

  @Field()
  @Column()
  completedAt: Date;

  @Field(() => Int)
  @Column({ default: 0 })
  xpEarned: number;

  @Field(() => Quiz)
  @ManyToOne(() => Quiz, (quiz) => quiz.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
