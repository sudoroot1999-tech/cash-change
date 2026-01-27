import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_levels')
@Index(['userId'], { unique: true })
export class UserLevel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ name: 'current_xp', type: 'bigint', default: 0 })
  currentXp: number;

  @Column({ name: 'total_xp', type: 'bigint', default: 0 })
  totalXp: number;

  @Column({ name: 'next_level_xp', type: 'bigint', default: 100 })
  nextLevelXp: number;

  @Column({ name: 'lifetime_xp', type: 'bigint', default: 0 })
  lifetimeXp: number;

  @Column({ name: 'perks', type: 'jsonb', default: {} })
  perks: Record<string, any>; // Level-based perks

  @Column({ name: 'fee_discount', type: 'decimal', precision: 10, scale: 4, default: 0 })
  feeDiscount: number;

  @Column({ name: 'has_copy_trading', type: 'boolean', default: false })
  hasCopyTrading: boolean;

  @Column({ name: 'has_advanced_analytics', type: 'boolean', default: false })
  hasAdvancedAnalytics: boolean;

  @Column({ name: 'has_vip_support', type: 'boolean', default: false })
  hasVipSupport: boolean;

  @Column({ name: 'exclusive_nft_earned', type: 'boolean', default: false })
  exclusiveNftEarned: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
