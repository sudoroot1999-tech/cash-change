import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID, Int, Float, registerEnumType } from '@nestjs/graphql';
import { Course } from './course.entity';

export enum ProgressStatus {
  ENROLLED = 'enrolled',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
}

registerEnumType(ProgressStatus, { name: 'ProgressStatus' });

@ObjectType()
export class ProgressDetails {
  @Field(() => [String])
  completedLessons: string[];

  @Field({ nullable: true })
  currentLesson?: string;

  @Field(() => Int)
  totalLessons: number;

  @Field(() => [String])
  completedModules: string[];

  @Field(() => Float)
  percentage: number;
}

@ObjectType()
export class QuizScore {
  @Field()
  quizId: string;

  @Field(() => Int)
  score: number;

  @Field(() => Int)
  maxScore: number;

  @Field(() => Float)
  percentage: number;

  @Field(() => Int)
  attempts: number;

  @Field()
  completedAt: Date;
}

@ObjectType()
export class UserNote {
  @Field()
  lessonId: string;

  @Field()
  note: string;

  @Field()
  timestamp: Date;
}

@ObjectType()
export class UserBookmark {
  @Field()
  lessonId: string;

  @Field(() => Int)
  timestamp: number;

  @Field({ nullable: true })
  note?: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class LearningStreak {
  @Field(() => Int)
  current: number;

  @Field(() => Int)
  longest: number;

  @Field()
  lastActivityDate: Date;
}

@ObjectType()
@Entity('user_progress')
@Unique(['userId', 'courseId'])
@Index(['userId', 'status'])
@Index(['courseId', 'status'])
export class UserProgress {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  userId: string;

  @Field()
  @Column('uuid')
  courseId: string;

  @Field()
  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  enrolledAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  startedAt?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  completedAt?: Date;

  @Field(() => ProgressStatus)
  @Column({ type: 'enum', enum: ProgressStatus, default: ProgressStatus.ENROLLED })
  status: ProgressStatus;

  @Field(() => ProgressDetails)
  @Column('jsonb', {
    default: {
      completedLessons: [],
      totalLessons: 0,
      completedModules: [],
      percentage: 0,
    },
  })
  progress: ProgressDetails;

  @Field(() => [QuizScore])
  @Column('jsonb', { default: [] })
  quizScores: QuizScore[];

  @Field(() => Int)
  @Column({ default: 0 })
  timeSpent: number;

  @Field()
  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  lastAccessedAt: Date;

  @Field()
  @Column({ default: false })
  certificateIssued: boolean;

  @Field({ nullable: true })
  @Column('uuid', { nullable: true })
  certificateId?: string;

  @Field(() => Int)
  @Column({ default: 0 })
  xpEarned: number;

  @Field(() => [UserNote])
  @Column('jsonb', { default: [] })
  notes: UserNote[];

  @Field(() => [UserBookmark])
  @Column('jsonb', { default: [] })
  bookmarks: UserBookmark[];

  @Field(() => LearningStreak)
  @Column('jsonb', {
    default: { current: 0, longest: 0, lastActivityDate: new Date() },
  })
  learningStreak: LearningStreak;

  @Field(() => Course)
  @ManyToOne(() => Course, (course) => course.userProgress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
