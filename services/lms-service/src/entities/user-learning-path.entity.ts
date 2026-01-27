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
import { LearningPath } from './learning-path.entity';

export enum UserLearningPathStatus {
  ENROLLED = 'enrolled',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  PAUSED = 'paused',
}

registerEnumType(UserLearningPathStatus, { name: 'UserLearningPathStatus' });

@ObjectType()
export class UserLearningPathProgress {
  @Field(() => [String])
  completedCourses: string[];

  @Field({ nullable: true })
  currentCourse?: string;

  @Field(() => Int)
  totalCourses: number;

  @Field(() => Float)
  percentage: number;
}

@ObjectType()
@Entity('user_learning_paths')
@Unique(['userId', 'learningPathId'])
export class UserLearningPath {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  userId: string;

  @Field()
  @Column('uuid')
  learningPathId: string;

  @Field()
  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  enrolledAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  startedAt?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  completedAt?: Date;

  @Field(() => UserLearningPathStatus)
  @Column({ type: 'enum', enum: UserLearningPathStatus, default: UserLearningPathStatus.ENROLLED })
  status: UserLearningPathStatus;

  @Field(() => UserLearningPathProgress)
  @Column('jsonb', {
    default: { completedCourses: [], totalCourses: 0, percentage: 0 },
  })
  progress: UserLearningPathProgress;

  @Field()
  @Column({ default: false })
  certificateIssued: boolean;

  @Field({ nullable: true })
  @Column('uuid', { nullable: true })
  certificateId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  estimatedCompletionDate?: Date;

  @Field(() => LearningPath)
  @ManyToOne(() => LearningPath, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'learningPathId' })
  learningPath: LearningPath;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
