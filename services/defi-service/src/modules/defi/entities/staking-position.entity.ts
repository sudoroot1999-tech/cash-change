import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum StakingType {
  FLEXIBLE = 'FLEXIBLE',
  LOCKED = 'LOCKED',
}

export enum StakingStatus {
  ACTIVE = 'ACTIVE',
  UNSTAKED = 'UNSTAKED',
  COMPLETED = 'COMPLETED',
}

@Entity('staking_positions')
@Index(['userId', 'status'])
@Index(['coin', 'stakingType'])
export class StakingPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'user_id' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  coin: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  amount: string;

  @Column({ type: 'decimal', precision: 30, scale: 18, default: '0' })
  rewardsEarned: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  apr: string;

  @Column({ type: 'enum', enum: StakingType })
  stakingType: StakingType;

  @Column({ type: 'int', nullable: true })
  lockDays: number | null;

  @Column({ type: 'timestamp', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'end_date' })
  endDate: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'unstaked_date' })
  unstakedDate: Date | null;

  @Column({ type: 'boolean', default: false })
  autoCompound: boolean;

  @Column({ type: 'enum', enum: StakingStatus, default: StakingStatus.ACTIVE })
  status: StakingStatus;

  @Column({ type: 'varchar', nullable: true })
  transactionHash: string | null;

  @Column({ type: 'varchar', nullable: true })
  contractAddress: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'last_reward_claim' })
  lastRewardClaim: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
