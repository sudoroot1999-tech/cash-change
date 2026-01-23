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
import { Wallet } from './wallet.entity';

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
  FEE = 'FEE',
  TRADE = 'TRADE',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMING = 'CONFIRMING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('transactions')
@Index(['txHash'])
@Index(['walletId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'wallet_id' })
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @Column({ type: 'decimal', precision: 36, scale: 18, default: '0' })
  fee: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ name: 'from_address', type: 'varchar', length: 255, nullable: true })
  fromAddress: string;

  @Column({ name: 'to_address', type: 'varchar', length: 255, nullable: true })
  toAddress: string;

  @Column({ name: 'tx_hash', type: 'varchar', length: 255, nullable: true })
  @Index()
  txHash: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  confirmations: number;

  @Column({ name: 'required_confirmations', type: 'int', default: 6 })
  requiredConfirmations: number;

  @Column({ name: 'block_number', type: 'bigint', nullable: true })
  blockNumber: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, nullable: true })
  @Index({ unique: true })
  idempotencyKey: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;
}
