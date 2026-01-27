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
  UNSTAKING = 'UNSTAKING',
  COMPLETED = 'COMPLETED',
  SLASHED = 'SLASHED',
}

@Entity('platform_staking')
@Index(['userId', 'status'])
export class PlatformStaking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  amount!: string;

  @Column({
    type: 'enum',
    enum: StakingStatus,
    default: StakingStatus.ACTIVE,
  })
  status!: StakingStatus;

  @Column({ type: 'int' })
  tier!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  allocationMultiplier!: string;

  @Column({ type: 'timestamp' })
  stakedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  unstakeRequestedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  unstakeAvailableAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  unstakedAt?: Date;

  @Column({ type: 'int', default: 7 })
  lockupDays!: number;

  @Column({ type: 'int', default: 0 })
  participationCount!: number;

  @Column({ type: 'decimal', precision: 30, scale: 18, default: 0 })
  rewardsEarned!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  stakingTransactionHash?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  unstakingTransactionHash?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
