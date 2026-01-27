import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BadgeRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum BadgeCategory {
  ACHIEVEMENT = 'achievement',
  MILESTONE = 'milestone',
  EVENT = 'event',
  SPECIAL = 'special',
  STREAK = 'streak',
}

@Entity('badges')
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'icon_url', type: 'varchar', nullable: true })
  iconUrl: string;

  @Column({
    type: 'enum',
    enum: BadgeRarity,
    default: BadgeRarity.COMMON,
  })
  rarity: BadgeRarity;

  @Column({
    type: 'enum',
    enum: BadgeCategory,
  })
  category: BadgeCategory;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ name: 'xp_reward', type: 'int', default: 0 })
  xpReward: number;

  @Column({ name: 'token_reward', type: 'decimal', precision: 18, scale: 8, default: 0 })
  tokenReward: number;

  @Column({ type: 'jsonb', nullable: true })
  criteria: Record<string, any>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
