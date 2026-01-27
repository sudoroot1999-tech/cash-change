import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TreasureHuntStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

@Entity('treasure_hunts')
@Index(['status', 'startDate', 'endDate'])
export class TreasureHunt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TreasureHuntStatus,
    default: TreasureHuntStatus.ACTIVE,
  })
  status: TreasureHuntStatus;

  @Column({ type: 'jsonb' })
  clues: Record<string, any>[]; // Array of clues

  @Column({ type: 'jsonb' })
  locations: string[]; // Hidden locations on platform

  @Column({ name: 'total_rewards', type: 'jsonb' })
  totalRewards: Record<string, any>;

  @Column({ name: 'first_finder_bonus', type: 'jsonb' })
  firstFinderBonus: Record<string, any>;

  @Column({ name: 'max_finders', type: 'int', default: 100 })
  maxFinders: number;

  @Column({ name: 'current_finders', type: 'int', default: 0 })
  currentFinders: number;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ name: 'is_seasonal', type: 'boolean', default: false })
  isSeasonal: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  season: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
