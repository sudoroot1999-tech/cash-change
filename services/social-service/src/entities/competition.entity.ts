import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int, Float, registerEnumType } from '@nestjs/graphql';

export enum CompetitionStatus {
  DRAFT = 'draft',
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

export enum CompetitionType {
  PNL = 'pnl',
  ROI = 'roi',
  WIN_RATE = 'win_rate',
  VOLUME = 'volume',
}

registerEnumType(CompetitionStatus, { name: 'CompetitionStatus' });
registerEnumType(CompetitionType, { name: 'CompetitionType' });

@ObjectType()
@Entity('competitions')
@Index(['status'])
@Index(['startDate', 'endDate'])
export class Competition {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ length: 200 })
  title: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  imageUrl?: string;

  @Field(() => CompetitionType)
  @Column({ type: 'enum', enum: CompetitionType, default: CompetitionType.PNL })
  type: CompetitionType;

  @Field(() => CompetitionStatus)
  @Column({ type: 'enum', enum: CompetitionStatus, default: CompetitionStatus.DRAFT })
  status: CompetitionStatus;

  @Field()
  @Column()
  startDate: Date;

  @Field()
  @Column()
  endDate: Date;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  entryFee?: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  prizePool: number;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  prizeDistribution?: Record<string, any>;

  @Field(() => Int)
  @Column({ default: 0 })
  participantsCount: number;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  maxParticipants?: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  minBalance?: number;

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  allowedPairs?: string[];

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  rules?: Record<string, any>;

  @Field()
  @Column({ default: true })
  isPublic: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  @Field({ nullable: true })
  isJoined?: boolean;
}
