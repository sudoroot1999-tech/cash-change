import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum RewardType {
  STAKING = 'STAKING',
  FARMING = 'FARMING',
  LENDING = 'LENDING',
  REFERRAL = 'REFERRAL',
}

export enum RewardStatus {
  PENDING = 'PENDING',
  CLAIMED = 'CLAIMED',
  COMPOUNDED = 'COMPOUNDED',
}

@Entity('rewards_history')
@Index(['userId', 'rewardType'])
@Index(['status'])
export class RewardHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'user_id' })
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: RewardType })
  rewardType: RewardType;

  @Column({ type: 'varchar', length: 20 })
  rewardAsset: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  amount: string;

  @Column({ type: 'decimal', precision: 30, scale: 18, nullable: true })
  valueUsd: string;

  @Column({ type: 'varchar', nullable: true })
  sourceId: string;

  @Column({ type: 'enum', enum: RewardStatus, default: RewardStatus.PENDING })
  status: RewardStatus;

  @Column({ type: 'varchar', nullable: true })
  transactionHash: string;

  @Column({ type: 'timestamp', nullable: true, name: 'claimed_at' })
  claimedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
