import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LiquidityPool } from './liquidity-pool.entity';

export enum LiquidityPositionStatus {
  ACTIVE = 'ACTIVE',
  REMOVED = 'REMOVED',
}

@Entity('liquidity_positions')
@Index(['userId', 'status'])
@Index(['poolId'])
export class LiquidityPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'user_id' })
  @Index()
  userId: string;

  @Column({ type: 'uuid', name: 'pool_id' })
  poolId: string;

  @ManyToOne(() => LiquidityPool)
  @JoinColumn({ name: 'pool_id' })
  pool: LiquidityPool;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  lpTokenAmount: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  token0Amount: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  token1Amount: string;

  @Column({ type: 'decimal', precision: 30, scale: 18, default: '0' })
  farmingRewards: string;

  @Column({ type: 'decimal', precision: 30, scale: 18, default: '0' })
  impermanentLoss: string;

  @Column({ type: 'enum', enum: LiquidityPositionStatus, default: LiquidityPositionStatus.ACTIVE })
  status: LiquidityPositionStatus;

  @Column({ type: 'boolean', default: false })
  autoHarvest: boolean;

  @Column({ type: 'boolean', default: false })
  autoRestake: boolean;

  @Column({ type: 'varchar', nullable: true })
  addLiquidityTxHash: string;

  @Column({ type: 'varchar', nullable: true })
  removeLiquidityTxHash: string;

  @Column({ type: 'timestamp', nullable: true, name: 'last_harvest_date' })
  lastHarvestDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
