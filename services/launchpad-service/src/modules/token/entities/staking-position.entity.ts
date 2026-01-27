import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum StakingStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EMERGENCY_WITHDRAWN = 'EMERGENCY_WITHDRAWN',
}

@Entity('staking_positions')
@Index(['userId', 'status'])
@Index(['endTime'])
export class StakingPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'stake_id', type: 'int' })
  stakeId: number; // On-chain stake ID

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @Column({ name: 'tier_id', type: 'int' })
  tierId: number;

  @Column({ name: 'lock_duration', type: 'int' })
  lockDuration: number; // in seconds

  @Column({ name: 'apy_basis_points', type: 'int' })
  apyBasisPoints: number;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  @Index()
  endTime: Date;

  @Column({ name: 'rewards_claimed', type: 'decimal', precision: 36, scale: 18, default: 0 })
  rewardsClaimed: string;

  @Column({ name: 'estimated_rewards', type: 'decimal', precision: 36, scale: 18, default: 0 })
  estimatedRewards: string;

  @Column({
    type: 'enum',
    enum: StakingStatus,
    default: StakingStatus.ACTIVE,
  })
  status: StakingStatus;

  @Column({ name: 'wallet_address', type: 'varchar', length: 42 })
  walletAddress: string;

  @Column({ name: 'last_reward_claim', type: 'timestamp', nullable: true })
  lastRewardClaim: Date;

  @Column({ name: 'tx_hash', type: 'varchar', length: 66 })
  txHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
