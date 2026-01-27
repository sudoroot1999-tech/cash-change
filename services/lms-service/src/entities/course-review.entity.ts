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

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

registerEnumType(ReviewStatus, { name: 'ReviewStatus' });

@ObjectType()
export class DetailedRatings {
  @Field(() => Int)
  content: number;

  @Field(() => Int)
  instructor: number;

  @Field(() => Int)
  value: number;

  @Field(() => Int)
  difficulty: number;
}

@ObjectType()
export class ReviewHelpful {
  @Field(() => Int)
  yes: number;

  @Field(() => Int)
  no: number;
}

@ObjectType()
export class InstructorResponse {
  @Field()
  comment: string;

  @Field()
  respondedAt: Date;
}

@ObjectType()
@Entity('course_reviews')
@Unique(['userId', 'courseId'])
@Index(['courseId', 'status', 'createdAt'])
export class CourseReview {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  userId: string;

  @Field()
  @Column('uuid')
  courseId: string;

  @Field(() => Int)
  @Column()
  rating: number;

  @Field()
  @Column({ length: 100 })
  title: string;

  @Field()
  @Column({ length: 1000 })
  comment: string;

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  pros: string[];

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  cons: string[];

  @Field(() => DetailedRatings, { nullable: true })
  @Column('jsonb', { nullable: true })
  ratings?: DetailedRatings;

  @Field(() => ReviewHelpful)
  @Column('jsonb', { default: { yes: 0, no: 0 } })
  helpful: ReviewHelpful;

  @Field()
  @Column({ default: false })
  verified: boolean;

  @Field(() => InstructorResponse, { nullable: true })
  @Column('jsonb', { nullable: true })
  instructorResponse?: InstructorResponse;

  @Field(() => ReviewStatus)
  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.APPROVED })
  status: ReviewStatus;

  @Field({ nullable: true })
  @Column({ nullable: true })
  moderationNote?: string;

  @Field()
  @Column({ default: false })
  featured: boolean;

  @Field(() => Course)
  @ManyToOne(() => Course, (course) => course.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
