import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID, Float, registerEnumType } from '@nestjs/graphql';
import { UserProfile } from './user-profile.entity';

export enum CopyTradingStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

registerEnumType(CopyTradingStatus, { name: 'CopyTradingStatus' });

@ObjectType()
@Entity('copy_trading_relationships')
@Index(['copierId'])
@Index(['traderId'])
@Unique(['copierId', 'traderId'])
export class CopyTradingRelationship {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  copierId: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'copierId', referencedColumnName: 'userId' })
  copier?: UserProfile;

  @Field()
  @Column()
  traderId: string;

  @Field(() => UserProfile, { nullable: true })
  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'traderId', referencedColumnName: 'userId' })
  trader?: UserProfile;

  @Field(() => CopyTradingStatus)
  @Column({ type: 'enum', enum: CopyTradingStatus, default: CopyTradingStatus.ACTIVE })
  status: CopyTradingStatus;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 18, scale: 8 })
  allocatedAmount: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  copyRatio: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxDrawdown?: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  stopLossAmount?: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  takeProfitAmount?: number;

  @Field()
  @Column({ default: true })
  copyAllPairs: boolean;

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  allowedPairs?: string[];

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  excludedPairs?: string[];

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  totalPnl: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  totalCopiedTrades: number;

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  stoppedAt?: Date;
}
