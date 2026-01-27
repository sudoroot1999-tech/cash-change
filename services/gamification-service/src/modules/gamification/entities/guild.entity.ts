import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum GuildStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISBANDED = 'disbanded',
}

@Entity('guilds')
@Index(['name'], { unique: true })
export class Guild {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  tag: string; // [TAG]

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  @Index()
  ownerId: string;

  @Column({
    type: 'enum',
    enum: GuildStatus,
    default: GuildStatus.ACTIVE,
  })
  status: GuildStatus;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'int', default: 0 })
  experience: number;

  @Column({ name: 'member_count', type: 'int', default: 1 })
  memberCount: number;

  @Column({ name: 'max_members', type: 'int', default: 50 })
  maxMembers: number;

  @Column({ name: 'total_trading_volume', type: 'decimal', precision: 18, scale: 8, default: 0 })
  totalTradingVolume: number;

  @Column({ name: 'total_xp_earned', type: 'int', default: 0 })
  totalXpEarned: number;

  @Column({ name: 'leaderboard_rank', type: 'int', nullable: true })
  leaderboardRank: number;

  @Column({ name: 'reward_pool', type: 'jsonb', default: {} })
  rewardPool: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  banner: string;

  @Column({ name: 'is_public', type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ name: 'requires_approval', type: 'boolean', default: false })
  requiresApproval: boolean;

  @Column({ name: 'min_level_required', type: 'int', default: 1 })
  minLevelRequired: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
