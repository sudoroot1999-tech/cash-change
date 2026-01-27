import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, Float, registerEnumType } from '@nestjs/graphql';

export enum LearningPathLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  MIXED = 'mixed',
}

registerEnumType(LearningPathLevel, { name: 'LearningPathLevel' });

@ObjectType()
export class LearningPathCourse {
  @Field()
  courseId: string;

  @Field(() => Int)
  order: number;

  @Field()
  isOptional: boolean;
}

@ObjectType()
export class LearningPathCertificate {
  @Field()
  enabled: boolean;

  @Field({ nullable: true })
  title?: string;

  @Field(() => Int)
  completionPercentage: number;

  @Field(() => Int)
  minimumScore: number;
}

@ObjectType()
export class LearningPathRating {
  @Field(() => Float)
  average: number;

  @Field(() => Int)
  count: number;
}

@ObjectType()
@Entity('learning_paths')
@Index(['isPublished', 'featured'])
export class LearningPath {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column({ unique: true })
  slug: string;

  @Field()
  @Column('text')
  description: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  thumbnail?: string;

  @Field()
  @Column()
  category: string;

  @Field(() => LearningPathLevel)
  @Column({ type: 'enum', enum: LearningPathLevel })
  level: LearningPathLevel;

  @Field(() => [LearningPathCourse])
  @Column('jsonb', { default: [] })
  courses: LearningPathCourse[];

  @Field(() => Int)
  @Column()
  duration: number;

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  skillsGained: string[];

  @Field(() => LearningPathCertificate)
  @Column('jsonb', {
    default: { enabled: true, completionPercentage: 100, minimumScore: 70 },
  })
  certificate: LearningPathCertificate;

  @Field(() => Int)
  @Column({ default: 0 })
  enrollmentCount: number;

  @Field(() => Float)
  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  completionRate: number;

  @Field(() => LearningPathRating)
  @Column('jsonb', { default: { average: 0, count: 0 } })
  rating: LearningPathRating;

  @Field()
  @Column({ default: false })
  isPublished: boolean;

  @Field()
  @Column({ default: false })
  featured: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
