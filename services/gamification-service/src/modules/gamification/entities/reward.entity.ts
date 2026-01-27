import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum RewardType {
  TOKEN = 'token',
  FEE_DISCOUNT = 'fee_discount',
  PRIORITY_SUPPORT = 'priority_support',
  EARLY_ACCESS = 'early_access',
  NFT = 'nft',
  XP_BOOST = 'xp_boost',
  CUSTOM = 'custom',
}

export enum RewardStatus {
  PENDING = 'pending',
  DISTRIBUTED = 'distributed',
  CLAIMED = 'claimed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('rewards')
@Index(['userId', 'status'])
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: RewardType,
  })
  type: RewardType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  amount: number;

  @Column({
    type: 'enum',
    enum: RewardStatus,
    default: RewardStatus.PENDING,
  })
  status: RewardStatus;

  @Column({ name: 'source_type', type: 'varchar' })
  sourceType: string;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'distributed_at', type: 'timestamp', nullable: true })
  distributedAt: Date;

  @Column({ name: 'claimed_at', type: 'timestamp', nullable: true })
  claimedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
