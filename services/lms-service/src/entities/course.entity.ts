import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, Float, registerEnumType } from '@nestjs/graphql';
import { Module } from './module.entity';
import { UserProgress } from './user-progress.entity';
import { CourseReview } from './course-review.entity';
import { Certificate } from './certificate.entity';

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum CourseCategory {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

registerEnumType(CourseLevel, { name: 'CourseLevel' });
registerEnumType(CourseCategory, { name: 'CourseCategory' });

@ObjectType()
export class Instructor {
  @Field()
  userId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  bio?: string;
}

@ObjectType()
export class CourseRating {
  @Field(() => Float)
  average: number;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class CourseCertificateSettings {
  @Field()
  enabled: boolean;

  @Field({ nullable: true })
  templateId?: string;

  @Field(() => Int)
  passingScore: number;
}

@ObjectType()
export class CourseSeo {
  @Field({ nullable: true })
  metaTitle?: string;

  @Field({ nullable: true })
  metaDescription?: string;

  @Field(() => [String], { nullable: true })
  keywords?: string[];
}

@ObjectType()
export class CourseResource {
  @Field()
  title: string;

  @Field()
  type: string;

  @Field()
  url: string;

  @Field(() => Int, { nullable: true })
  size?: number;
}

@ObjectType()
@Entity('courses')
@Index(['title', 'description'])
@Index(['category', 'isPublished'])
@Index(['enrollmentCount'])
export class Course {
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

  @Field()
  @Column({ length: 200 })
  shortDescription: string;

  @Field(() => CourseCategory)
  @Column({ type: 'enum', enum: CourseCategory })
  category: CourseCategory;

  @Field()
  @Column()
  subcategory: string;

  @Field(() => Instructor)
  @Column('jsonb')
  instructor: Instructor;

  @Field()
  @Column()
  thumbnail: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  previewVideo?: string;

  @Field(() => CourseLevel)
  @Column({ type: 'enum', enum: CourseLevel })
  level: CourseLevel;

  @Field(() => Int)
  @Column()
  duration: number;

  @Field()
  @Column({ default: 'en' })
  language: string;

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  tags: string[];

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  requirements: string[];

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  learningObjectives: string[];

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  targetAudience: string[];

  @Field(() => Float)
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @Field(() => Float, { nullable: true })
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  discountPrice?: number;

  @Field()
  @Column({ default: false })
  isFree: boolean;

  @Field()
  @Column({ default: false })
  isPublished: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true })
  publishedAt?: Date;

  @Field(() => CourseRating)
  @Column('jsonb', { default: { average: 0, count: 0 } })
  rating: CourseRating;

  @Field(() => Int)
  @Column({ default: 0 })
  enrollmentCount: number;

  @Field(() => Float)
  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  completionRate: number;

  @Field(() => CourseCertificateSettings)
  @Column('jsonb', { default: { enabled: true, passingScore: 70 } })
  certificate: CourseCertificateSettings;

  @Field(() => CourseSeo, { nullable: true })
  @Column('jsonb', { nullable: true })
  seo?: CourseSeo;

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  features: string[];

  @Field(() => [CourseResource])
  @Column('jsonb', { default: [] })
  resources: CourseResource[];

  @Field(() => [Module], { nullable: true })
  @OneToMany(() => Module, (module) => module.course)
  modules?: Module[];

  @OneToMany(() => UserProgress, (progress) => progress.course)
  userProgress?: UserProgress[];

  @OneToMany(() => CourseReview, (review) => review.course)
  reviews?: CourseReview[];

  @OneToMany(() => Certificate, (cert) => cert.course)
  certificates?: Certificate[];

  @ManyToMany(() => Course)
  @JoinTable({ name: 'related_courses' })
  relatedCourses?: Course[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
