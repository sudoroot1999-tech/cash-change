import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, Float, registerEnumType } from '@nestjs/graphql';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum TraderLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  MASTER = 'master',
}

registerEnumType(UserStatus, { name: 'UserStatus' });
registerEnumType(TraderLevel, { name: 'TraderLevel' });

@ObjectType()
@Entity('user_profiles')
@Index(['userId'], { unique: true })
@Index(['username'], { unique: true })
export class UserProfile {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  userId: string;

  @Field()
  @Column({ unique: true, length: 50 })
  username: string;

  @Field({ nullable: true })
  @Column({ nullable: true, length: 100 })
  displayName?: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  coverImageUrl?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  website?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  location?: string;

  @Field(() => UserStatus)
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Field(() => TraderLevel)
  @Column({ type: 'enum', enum: TraderLevel, default: TraderLevel.BEGINNER })
  traderLevel: TraderLevel;

  @Field()
  @Column({ default: false })
  isVerified: boolean;

  @Field()
  @Column({ default: false })
  isTrader: boolean;

  @Field()
  @Column({ default: true })
  allowCopyTrading: boolean;

  @Field()
  @Column({ default: true })
  isPublic: boolean;

  @Field(() => Int)
  @Column({ default: 0 })
  followersCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  followingCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  postsCount: number;

  @Field(() => Int)
  @Column({ default: 0 })
  copiersCount: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalPnl: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  winRate: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  riskScore: number;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  tradingStats?: Record<string, any>;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  socialLinks?: Record<string, string>;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  preferences?: Record<string, any>;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastActiveAt?: Date;
}
