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
import { UserProfile } from './user-profile.entity';
import { Channel } from './channel.entity';

export enum ChannelPostType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  SIGNAL = 'signal',
  ANALYSIS = 'analysis',
  POLL = 'poll',
}

registerEnumType(ChannelPostType, { name: 'ChannelPostType' });

@ObjectType()
@Entity('channel_posts')
@Index(['channelId', 'createdAt'])
@Index(['authorId'])
export class ChannelPost {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  channelId: string;

  @Field(() => Channel)
  @ManyToOne(() => Channel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: Channel;

  @Field()
  @Column()
  authorId: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId', referencedColumnName: 'userId' })
  author?: UserProfile;

  @Field(() => ChannelPostType)
  @Column({ type: 'enum', enum: ChannelPostType, default: ChannelPostType.TEXT })
  type: ChannelPostType;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  content?: string;

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  mediaUrls?: string[];

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  signalData?: Record<string, any>;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  pollData?: Record<string, any>;

  @Field(() => Int)
  @Column({ default: 0 })
  viewsCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  likesCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  commentsCount: number;

  @Field()
  @Column({ default: false })
  isPinned: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  deletedAt?: Date;
}
