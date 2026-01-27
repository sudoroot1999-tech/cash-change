import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PoolStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

@Entity('liquidity_pools')
@Index(['token0', 'token1'])
@Index(['status'])
export class LiquidityPool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  token0: string;

  @Column({ type: 'varchar', length: 20 })
  token1: string;

  @Column({ type: 'varchar', unique: true })
  pairSymbol: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  reserve0: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  reserve1: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  tvl: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  apr: string;

  @Column({ type: 'decimal', precision: 30, scale: 18, default: '0' })
  totalLpTokens: string;

  @Column({ type: 'decimal', precision: 30, scale: 18, default: '0' })
  totalRewardsDistributed: string;

  @Column({ type: 'varchar' })
  lpTokenAddress: string;

  @Column({ type: 'varchar' })
  contractAddress: string;

  @Column({ type: 'enum', enum: PoolStatus, default: PoolStatus.ACTIVE })
  status: PoolStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0.3' })
  feePercentage: string;

  @Column({ type: 'timestamp', nullable: true, name: 'last_reward_distribution' })
  lastRewardDistribution: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
