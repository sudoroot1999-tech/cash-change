import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { UserProfile } from './user-profile.entity';

export enum PostType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  TRADE_IDEA = 'trade_idea',
  ANALYSIS = 'analysis',
  POLL = 'poll',
  SHARED = 'shared',
}

export enum PostVisibility {
  PUBLIC = 'public',
  FOLLOWERS = 'followers',
  PRIVATE = 'private',
}

registerEnumType(PostType, { name: 'PostType' });
registerEnumType(PostVisibility, { name: 'PostVisibility' });

@ObjectType()
@Entity('posts')
@Index(['authorId'])
@Index(['createdAt'])
@Index(['type'])
export class Post {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  authorId: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId', referencedColumnName: 'userId' })
  author?: UserProfile;

  @Field(() => PostType)
  @Column({ type: 'enum', enum: PostType, default: PostType.TEXT })
  type: PostType;

  @Field(() => PostVisibility)
  @Column({ type: 'enum', enum: PostVisibility, default: PostVisibility.PUBLIC })
  visibility: PostVisibility;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  content?: string;

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  mediaUrls?: string[];

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  tradeData?: Record<string, any>;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  pollData?: Record<string, any>;

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  hashtags?: string[];

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  mentions?: string[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  sharedPostId?: string;

  @Field(() => Post, { nullable: true })
  @ManyToOne(() => Post, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sharedPostId' })
  sharedPost?: Post;

  @Field(() => Int)
  @Column({ default: 0 })
  likesCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  commentsCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  sharesCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  viewsCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  bookmarksCount: number;

  @Field()
  @Column({ default: false })
  isPinned: boolean;

  @Field()
  @Column({ default: false })
  isEdited: boolean;

  @Field()
  @Column({ default: true })
  allowComments: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  deletedAt?: Date;

  // Virtual fields for GraphQL
  @Field({ nullable: true })
  isLiked?: boolean;

  @Field({ nullable: true })
  isBookmarked?: boolean;
}
