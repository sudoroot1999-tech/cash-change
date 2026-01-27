import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ChallengeType {
  SOLO = 'solo',
  TEAM = 'team',
  GLOBAL = 'global',
}

export enum ChallengeStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ChallengeType,
  })
  type: ChallengeType;

  @Column({
    type: 'enum',
    enum: ChallengeStatus,
    default: ChallengeStatus.UPCOMING,
  })
  @Index()
  status: ChallengeStatus;

  @Column({ name: 'start_date', type: 'timestamp' })
  @Index()
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  @Index()
  endDate: Date;

  @Column({ type: 'jsonb' })
  rules: Record<string, any>;

  @Column({ type: 'jsonb' })
  rewards: Record<string, any>;

  @Column({ name: 'max_participants', type: 'int', nullable: true })
  maxParticipants: number;

  @Column({ name: 'entry_fee', type: 'decimal', precision: 18, scale: 8, default: 0 })
  entryFee: number;

  @Column({ name: 'prize_pool', type: 'decimal', precision: 18, scale: 8, default: 0 })
  prizePool: number;

  @Column({ name: 'banner_url', type: 'varchar', nullable: true })
  bannerUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
