import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TournamentType {
  PRICE_PREDICTION = 'price_prediction',
  TRADING_SIMULATOR = 'trading_simulator',
  QUIZ = 'quiz',
  MIXED = 'mixed',
}

export enum TournamentStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('tournaments')
@Index(['type', 'status'])
@Index(['startDate', 'endDate'])
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TournamentType,
  })
  type: TournamentType;

  @Column({
    type: 'enum',
    enum: TournamentStatus,
    default: TournamentStatus.UPCOMING,
  })
  status: TournamentStatus;

  @Column({ name: 'entry_fee', type: 'decimal', precision: 18, scale: 8, default: 0 })
  entryFee: number;

  @Column({ name: 'prize_pool', type: 'jsonb' })
  prizePool: Record<string, any>;

  @Column({ name: 'max_participants', type: 'int', nullable: true })
  maxParticipants: number;

  @Column({ name: 'current_participants', type: 'int', default: 0 })
  currentParticipants: number;

  @Column({ type: 'jsonb' })
  rules: Record<string, any>;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ name: 'is_daily', type: 'boolean', default: false })
  isDaily: boolean;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
