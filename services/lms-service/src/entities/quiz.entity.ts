import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { QuizAttempt } from './quiz-attempt.entity';

export enum QuizType {
  LESSON = 'lesson',
  MODULE = 'module',
  COURSE = 'course',
  ASSESSMENT = 'assessment',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple-choice',
  TRUE_FALSE = 'true-false',
  MULTIPLE_ANSWER = 'multiple-answer',
  TEXT = 'text',
}

registerEnumType(QuizType, { name: 'QuizType' });
registerEnumType(QuestionType, { name: 'QuestionType' });

@ObjectType()
export class QuizQuestion {
  @Field()
  id: string;

  @Field()
  question: string;

  @Field(() => QuestionType)
  type: QuestionType;

  @Field(() => [String], { nullable: true })
  options?: string[];

  @Field(() => [String])
  correctAnswer: string[];

  @Field({ nullable: true })
  explanation?: string;

  @Field(() => Int)
  points: number;
}

@ObjectType()
@Entity('quizzes')
@Index(['lessonId'])
@Index(['courseId'])
export class Quiz {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  title: string;

  @Field({ nullable: true })
  @Column('text', { nullable: true })
  description?: string;

  @Field({ nullable: true })
  @Column('uuid', { nullable: true })
  lessonId?: string;

  @Field({ nullable: true })
  @Column('uuid', { nullable: true })
  courseId?: string;

  @Field(() => QuizType)
  @Column({ type: 'enum', enum: QuizType })
  type: QuizType;

  @Field(() => [QuizQuestion])
  @Column('jsonb', { default: [] })
  questions: QuizQuestion[];

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  timeLimit?: number;

  @Field(() => Int)
  @Column({ default: 70 })
  passingScore: number;

  @Field(() => Int)
  @Column({ default: 3 })
  attemptsAllowed: number;

  @Field()
  @Column({ default: true })
  shuffleQuestions: boolean;

  @Field()
  @Column({ default: true })
  shuffleOptions: boolean;

  @Field()
  @Column({ default: true })
  showCorrectAnswers: boolean;

  @Field(() => Int)
  @Column({ default: 50 })
  xpReward: number;

  @OneToMany(() => QuizAttempt, (attempt) => attempt.quiz)
  attempts?: QuizAttempt[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
