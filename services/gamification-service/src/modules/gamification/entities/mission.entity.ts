import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MissionType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ONE_TIME = 'one_time',
  RECURRING = 'recurring',
}

export enum MissionCategory {
  TRADING = 'trading',
  SOCIAL = 'social',
  EDUCATIONAL = 'educational',
  REFERRAL = 'referral',
  LOGIN = 'login',
}

@Entity('missions')
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  code: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: MissionType,
  })
  type: MissionType;

  @Column({
    type: 'enum',
    enum: MissionCategory,
  })
  category: MissionCategory;

  @Column({ name: 'target_value', type: 'int' })
  targetValue: number;

  @Column({ name: 'xp_reward', type: 'int', default: 0 })
  xpReward: number;

  @Column({ name: 'token_reward', type: 'decimal', precision: 18, scale: 8, default: 0 })
  tokenReward: number;

  @Column({ type: 'jsonb', nullable: true })
  requirements: Record<string, any>;

  @Column({ name: 'icon_url', type: 'varchar', nullable: true })
  iconUrl: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
