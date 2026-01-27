import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { Module } from './module.entity';
import { Course } from './course.entity';
import { Quiz } from './quiz.entity';
import { Discussion } from './discussion.entity';

export enum LessonType {
  VIDEO = 'video',
  ARTICLE = 'article',
  QUIZ = 'quiz',
  EXERCISE = 'exercise',
  CODE = 'code',
}

export enum VideoPlatform {
  YOUTUBE = 'youtube',
  VIMEO = 'vimeo',
  S3 = 's3',
}

export enum CompletionCriteriaType {
  VIEW = 'view',
  QUIZ = 'quiz',
  EXERCISE = 'exercise',
}

registerEnumType(LessonType, { name: 'LessonType' });
registerEnumType(VideoPlatform, { name: 'VideoPlatform' });
registerEnumType(CompletionCriteriaType, { name: 'CompletionCriteriaType' });

@ObjectType()
export class CodeSnippet {
  @Field()
  language: string;

  @Field()
  code: string;

  @Field({ nullable: true })
  description?: string;
}

@ObjectType()
export class LessonContent {
  @Field({ nullable: true })
  videoUrl?: string;

  @Field(() => VideoPlatform, { nullable: true })
  videoPlatform?: VideoPlatform;

  @Field({ nullable: true })
  videoId?: string;

  @Field(() => Int, { nullable: true })
  videoDuration?: number;

  @Field({ nullable: true })
  articleContent?: string;

  @Field(() => [CodeSnippet], { nullable: true })
  codeSnippets?: CodeSnippet[];
}

@ObjectType()
export class LessonResource {
  @Field()
  title: string;

  @Field()
  url: string;

  @Field()
  type: string;
}

@ObjectType()
export class CompletionCriteria {
  @Field(() => CompletionCriteriaType)
  type: CompletionCriteriaType;

  @Field(() => Int, { nullable: true })
  requiredScore?: number;
}

@ObjectType()
@Entity('lessons')
@Index(['moduleId', 'order'])
@Index(['courseId'])
export class Lesson {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column('uuid')
  moduleId: string;

  @Field()
  @Column('uuid')
  courseId: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column('text')
  description: string;

  @Field(() => Int)
  @Column()
  order: number;

  @Field(() => LessonType)
  @Column({ type: 'enum', enum: LessonType })
  type: LessonType;

  @Field(() => LessonContent)
  @Column('jsonb', { default: {} })
  content: LessonContent;

  @Field(() => [LessonResource])
  @Column('jsonb', { default: [] })
  resources: LessonResource[];

  @Field({ nullable: true })
  @Column('uuid', { nullable: true })
  quizId?: string;

  @Field(() => Int)
  @Column({ default: 0 })
  duration: number;

  @Field(() => Int)
  @Column({ default: 100 })
  xpReward: number;

  @Field()
  @Column({ default: false })
  isPreview: boolean;

  @Field()
  @Column({ default: true })
  isMandatory: boolean;

  @Field(() => CompletionCriteria)
  @Column('jsonb', { default: { type: 'view' } })
  completionCriteria: CompletionCriteria;

  @Field(() => Module)
  @ManyToOne(() => Module, (module) => module.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moduleId' })
  module: Module;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Field(() => Quiz, { nullable: true })
  @OneToOne(() => Quiz, { nullable: true })
  @JoinColumn({ name: 'quizId' })
  quiz?: Quiz;

  @OneToMany(() => Discussion, (discussion) => discussion.lesson)
  discussions?: Discussion[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
