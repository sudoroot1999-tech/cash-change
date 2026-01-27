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
import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { UserProfile } from './user-profile.entity';
import { Competition } from './competition.entity';

@ObjectType()
@Entity('competition_participants')
@Index(['competitionId', 'rank'])
@Index(['userId'])
@Unique(['userId', 'competitionId'])
export class CompetitionParticipant {
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

  @Field()
  @Column()
  competitionId: string;

  @Field(() => Competition)
  @ManyToOne(() => Competition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competitionId' })
  competition: Competition;

  @Field(() => Int)
  @Column({ default: 0 })
  rank: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  score: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  pnl: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  roi: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  winRate: number;

  @Field(() => Int)
  @Column({ default: 0 })
  totalTrades: number;

  @Field(() => Int)
  @Column({ default: 0 })
  winningTrades: number;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  volume: number;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  prizeWon?: number;

  @Field()
  @CreateDateColumn()
  joinedAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
