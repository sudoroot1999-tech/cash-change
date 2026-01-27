import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum TransactionType {
  TRANSFER = 'TRANSFER',
  STAKE = 'STAKE',
  UNSTAKE = 'UNSTAKE',
  REWARD = 'REWARD',
  BURN = 'BURN',
  MINT = 'MINT',
  AIRDROP = 'AIRDROP',
  VESTING_CLAIM = 'VESTING_CLAIM',
  FEE_PAYMENT = 'FEE_PAYMENT',
  BUYBACK = 'BUYBACK',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

@Entity('token_transactions')
@Index(['userId', 'createdAt'])
@Index(['txHash'])
@Index(['type', 'status'])
export class TokenTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'from_address', type: 'varchar', length: 42, nullable: true })
  @Index()
  fromAddress: string;

  @Column({ name: 'to_address', type: 'varchar', length: 42, nullable: true })
  @Index()
  toAddress: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ name: 'tx_hash', type: 'varchar', length: 66, nullable: true })
  @Index()
  txHash: string;

  @Column({ name: 'block_number', type: 'bigint', nullable: true })
  blockNumber: number;

  @Column({ type: 'varchar', length: 10, default: 'ETH' })
  network: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
