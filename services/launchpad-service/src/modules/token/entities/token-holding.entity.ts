import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('token_holdings')
@Index(['userId'])
@Index(['userId', 'balance'])
export class TokenHolding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'decimal', precision: 36, scale: 18, default: 0 })
  balance: string;

  @Column({ name: 'locked_balance', type: 'decimal', precision: 36, scale: 18, default: 0 })
  lockedBalance: string;

  @Column({ name: 'staked_balance', type: 'decimal', precision: 36, scale: 18, default: 0 })
  stakedBalance: string;

  @Column({ name: 'total_earned', type: 'decimal', precision: 36, scale: 18, default: 0 })
  totalEarned: string;

  @Column({ name: 'total_burned', type: 'decimal', precision: 36, scale: 18, default: 0 })
  totalBurned: string;

  @Column({ name: 'wallet_address', type: 'varchar', length: 42, nullable: true })
  @Index()
  walletAddress: string;

  @Column({ name: 'fee_discount_tier', type: 'int', default: 0 })
  feeDiscountTier: number;

  @Column({ name: 'last_snapshot_balance', type: 'decimal', precision: 36, scale: 18, default: 0 })
  lastSnapshotBalance: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
