import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TransactionType {
  DEPOSIT = 'deposit', WITHDRAWAL = 'withdrawal', TRANSFER_IN = 'transfer_in', TRANSFER_OUT = 'transfer_out', TRADE = 'trade', FEE = 'fee', REWARD = 'reward',
}

export enum TransactionStatus {
  PENDING = 'pending', PROCESSING = 'processing', COMPLETED = 'completed', FAILED = 'failed', CANCELLED = 'cancelled',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @Column({ type: 'decimal', precision: 36, scale: 18, default: '0' })
  fee: string;

  @Index()
  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ name: 'tx_hash', length: 255, nullable: true })
  txHash: string | null;

  @Column({ name: 'from_address', length: 255, nullable: true })
  fromAddress: string | null;

  @Column({ name: 'to_address', length: 255, nullable: true })
  toAddress: string | null;

  @Column({ default: 0 })
  confirmations: number;

  @Column({ name: 'required_confirmations', default: 1 })
  requiredConfirmations: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
