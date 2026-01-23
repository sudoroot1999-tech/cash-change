import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DepositStatus {
  DETECTED = 'DETECTED',
  PENDING = 'PENDING',
  CONFIRMING = 'CONFIRMING',
  CONFIRMED = 'CONFIRMED',
  CREDITED = 'CREDITED',
  FAILED = 'FAILED',
}

@Entity('deposit_history')
@Index(['txHash'], { unique: true })
@Index(['userId', 'createdAt'])
@Index(['walletId', 'createdAt'])
export class DepositHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'wallet_id' })
  walletId: string;

  @Column({ name: 'address_id' })
  addressId: string;

  @Column({ name: 'from_address', type: 'varchar', length: 255 })
  fromAddress: string;

  @Column({ name: 'to_address', type: 'varchar', length: 255 })
  toAddress: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({ name: 'tx_hash', type: 'varchar', length: 255 })
  @Index()
  txHash: string;

  @Column({ type: 'int', default: 0 })
  confirmations: number;

  @Column({ name: 'required_confirmations', type: 'int', default: 6 })
  requiredConfirmations: number;

  @Column({
    type: 'enum',
    enum: DepositStatus,
    default: DepositStatus.DETECTED,
  })
  status: DepositStatus;

  @Column({ name: 'block_number', type: 'bigint', nullable: true })
  blockNumber: string;

  @Column({ name: 'block_timestamp', type: 'timestamp', nullable: true })
  blockTimestamp: Date;

  @Column({ name: 'transaction_id', type: 'varchar', length: 255, nullable: true })
  transactionId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'credited_at', type: 'timestamp', nullable: true })
  creditedAt: Date;
}
