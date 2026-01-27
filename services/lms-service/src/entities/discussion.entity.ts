import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { Lesson } from './lesson.entity';
import { Course } from './course.entity';

export enum DiscussionType {
  QUESTION = 'question',
  DISCUSSION = 'discussion',
  ISSUE = 'issue',
}

export enum DiscussionStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

registerEnumType(DiscussionType, { name: 'DiscussionType' });
registerEnumType(DiscussionStatus, { name: 'DiscussionStatus' });

@ObjectType()
export class DiscussionReply {
  @Field()
  id: string;

  @Field()
  userId: string;

  @Field()
  userName: string;

  @Field({ nullable: true })
  userAvatar?: string;

  @Field()
  content: string;

  @Field()
  isInstructor: boolean;

  @Field()
  isSolution: boolean;

  @Field(() => Int)
  likes: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
@Entity('discussions')
@Index(['lessonId', 'createdAt'])
@Index(['courseId', 'type'])
export class Discussion {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column('uuid')
  lessonId: string;

  @Field()
  @Column('uuid')
  courseId: string;

  @Field()
  @Column()
  userId: string;

  @Field()
  @Column()
  userName: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  userAvatar?: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column('text')
  content: string;

  @Field(() => DiscussionType)
  @Column({ type: 'enum', enum: DiscussionType, default: DiscussionType.DISCUSSION })
  type: DiscussionType;

  @Field(() => [String])
  @Column('simple-array', { default: '' })
  tags: string[];

  @Field(() => [DiscussionReply])
  @Column('jsonb', { default: [] })
  replies: DiscussionReply[];

  @Field(() => Int)
  @Column({ default: 0 })
  views: number;

  @Field(() => Int)
  @Column({ default: 0 })
  likes: number;

  @Field()
  @Column({ default: false })
  solved: boolean;

  @Field()
  @Column({ default: false })
  pinned: boolean;

  @Field()
  @Column({ default: false })
  locked: boolean;

  @Field(() => DiscussionStatus)
  @Column({ type: 'enum', enum: DiscussionStatus, default: DiscussionStatus.ACTIVE })
  status: DiscussionStatus;

  @Field(() => Lesson)
  @ManyToOne(() => Lesson, (lesson) => lesson.discussions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
