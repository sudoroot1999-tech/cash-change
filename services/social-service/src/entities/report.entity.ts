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
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { UserProfile } from './user-profile.entity';

export enum ReportReason {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  HATE_SPEECH = 'hate_speech',
  MISINFORMATION = 'misinformation',
  SCAM = 'scam',
  INAPPROPRIATE = 'inappropriate',
  COPYRIGHT = 'copyright',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum ReportTargetType {
  POST = 'post',
  COMMENT = 'comment',
  USER = 'user',
  MESSAGE = 'message',
  CHANNEL = 'channel',
}

registerEnumType(ReportReason, { name: 'ReportReason' });
registerEnumType(ReportStatus, { name: 'ReportStatus' });
registerEnumType(ReportTargetType, { name: 'ReportTargetType' });

@ObjectType()
@Entity('reports')
@Index(['reporterId'])
@Index(['status'])
@Index(['targetType', 'targetId'])
export class Report {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  reporterId: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reporterId', referencedColumnName: 'userId' })
  reporter?: UserProfile;

  @Field(() => ReportTargetType)
  @Column({ type: 'enum', enum: ReportTargetType })
  targetType: ReportTargetType;

  @Field()
  @Column()
  targetId: string;

  @Field(() => ReportReason)
  @Column({ type: 'enum', enum: ReportReason })
  reason: ReportReason;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  evidenceUrls?: string[];

  @Field(() => ReportStatus)
  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @Field({ nullable: true })
  @Column({ nullable: true })
  reviewerId?: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  resolution?: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  resolvedAt?: Date;
}
