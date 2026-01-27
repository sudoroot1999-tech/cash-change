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

export enum ChannelType {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum ChannelCategory {
  GENERAL = 'general',
  TRADING = 'trading',
  ANALYSIS = 'analysis',
  NEWS = 'news',
  EDUCATION = 'education',
  SIGNALS = 'signals',
}

registerEnumType(ChannelType, { name: 'ChannelType' });
registerEnumType(ChannelCategory, { name: 'ChannelCategory' });

@ObjectType()
@Entity('channels')
@Index(['ownerId'])
@Index(['type'])
@Index(['category'])
export class Channel {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ length: 100 })
  name: string;

  @Field({ nullable: true })
  @Column({ unique: true, length: 50 })
  handle: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  coverImageUrl?: string;

  @Field()
  @Column()
  ownerId: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId', referencedColumnName: 'userId' })
  owner?: UserProfile;

  @Field(() => ChannelType)
  @Column({ type: 'enum', enum: ChannelType, default: ChannelType.PUBLIC })
  type: ChannelType;

  @Field(() => ChannelCategory)
  @Column({ type: 'enum', enum: ChannelCategory, default: ChannelCategory.GENERAL })
  category: ChannelCategory;

  @Field(() => Int)
  @Column({ default: 0 })
  subscribersCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  postsCount: number;

  @Field()
  @Column({ default: false })
  isVerified: boolean;

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  rules?: string[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  @Field({ nullable: true })
  isSubscribed?: boolean;
}
