import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { UserProfile } from './user-profile.entity';

export enum StoryType {
  IMAGE = 'image',
  VIDEO = 'video',
  TEXT = 'text',
}

registerEnumType(StoryType, { name: 'StoryType' });

@ObjectType()
@Entity('stories')
@Index(['authorId'])
@Index(['expiresAt'])
export class Story {
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

  @Field(() => StoryType)
  @Column({ type: 'enum', enum: StoryType, default: StoryType.IMAGE })
  type: StoryType;

  @Field({ nullable: true })
  @Column({ nullable: true })
  mediaUrl?: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  content?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  backgroundColor?: string;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  textStyle?: Record<string, any>;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  stickers?: Record<string, any>[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  linkUrl?: string;

  @Field(() => Int)
  @Column({ default: 0 })
  viewsCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  likesCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  repliesCount: number;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @Column()
  expiresAt: Date;

  // Virtual fields
  @Field({ nullable: true })
  isViewed?: boolean;

  @Field({ nullable: true })
  isLiked?: boolean;
}
