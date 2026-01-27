import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum BurnType {
  MANUAL = 'MANUAL',
  BUYBACK = 'BUYBACK',
  FEE_BURN = 'FEE_BURN',
  PENALTY = 'PENALTY',
}

@Entity('burn_history')
@Index(['burnType', 'createdAt'])
@Index(['txHash'])
export class BurnHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @Column({
    type: 'enum',
    enum: BurnType,
  })
  burnType: BurnType;

  @Column({ name: 'burned_by', type: 'varchar', length: 42 })
  burnedBy: string;

  @Column({ name: 'tx_hash', type: 'varchar', length: 66 })
  @Index()
  txHash: string;

  @Column({ name: 'block_number', type: 'bigint' })
  blockNumber: number;

  @Column({ name: 'eth_spent', type: 'decimal', precision: 36, scale: 18, nullable: true })
  ethSpent: string; // For buybacks

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
