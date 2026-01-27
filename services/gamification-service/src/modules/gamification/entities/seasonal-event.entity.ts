import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum EventSeason {
  HALLOWEEN = 'halloween',
  BLACK_FRIDAY = 'black_friday',
  CHRISTMAS = 'christmas',
  NEW_YEAR = 'new_year',
  BULL_MARKET = 'bull_market',
  BEAR_MARKET = 'bear_market',
  CUSTOM = 'custom',
}

export enum EventStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

@Entity('seasonal_events')
@Index(['season', 'status'])
export class SeasonalEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: EventSeason,
  })
  season: EventSeason;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.UPCOMING,
  })
  status: EventStatus;

  @Column({ type: 'jsonb' })
  activities: Record<string, any>[]; // Array of activities

  @Column({ type: 'jsonb' })
  rewards: Record<string, any>;

  @Column({ name: 'bonus_multiplier', type: 'decimal', precision: 10, scale: 2, default: 1 })
  bonusMultiplier: number;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ name: 'theme_color', type: 'varchar', length: 20, nullable: true })
  themeColor: string;

  @Column({ name: 'theme_image', type: 'varchar', length: 255, nullable: true })
  themeImage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
