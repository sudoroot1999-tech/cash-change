import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { UserProfile } from './user-profile.entity';

export enum FollowStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
}

registerEnumType(FollowStatus, { name: 'FollowStatus' });

@ObjectType()
@Entity('followers')
@Index(['followerId'])
@Index(['followingId'])
@Unique(['followerId', 'followingId'])
export class Follower {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  followerId: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followerId', referencedColumnName: 'userId' })
  follower?: UserProfile;

  @Field()
  @Column()
  followingId: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followingId', referencedColumnName: 'userId' })
  following?: UserProfile;

  @Field(() => FollowStatus)
  @Column({ type: 'enum', enum: FollowStatus, default: FollowStatus.ACCEPTED })
  status: FollowStatus;

  @Field()
  @Column({ default: false })
  notificationsEnabled: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
