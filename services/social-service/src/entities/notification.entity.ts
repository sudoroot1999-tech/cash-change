import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { UserProfile } from './user-profile.entity';

// SOCIAL_NOTIFICATION_TYPE
export enum NotificationType {
  FOLLOW = 'follow',
  LIKE = 'like',
  COMMENT = 'comment',
  MENTION = 'mention',
  MESSAGE = 'message',
  COPY_TRADE = 'copy_trade',
  COMPETITION = 'competition',
  ACHIEVEMENT = 'achievement',
  SYSTEM = 'system',
}

registerEnumType(NotificationType, { name: 'NotificationType' });

@ObjectType()
@Entity('notifications')
@Index(['userId', 'createdAt'])
@Index(['userId', 'isRead'])
export class Notification {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  userId: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  user?: UserProfile;

  @Field(() => NotificationType)
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Field()
  @Column({ length: 200 })
  title: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  message?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  actorId?: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorId', referencedColumnName: 'userId' })
  actor?: UserProfile;

  @Field({ nullable: true })
  @Column({ nullable: true })
  targetId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  targetType?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  actionUrl?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  imageUrl?: string;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Field()
  @Column({ default: false })
  isRead: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  readAt?: Date;
}
