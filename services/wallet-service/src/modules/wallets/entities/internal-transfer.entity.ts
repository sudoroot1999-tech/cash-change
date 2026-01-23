import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum InternalTransferStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

@Entity('internal_transfers')
@Index(['fromUserId', 'createdAt'])
@Index(['toUserId', 'createdAt'])
@Index(['idempotencyKey'], { unique: true })
export class InternalTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'from_user_id' })
  @Index()
  fromUserId: string;

  @Column({ name: 'to_user_id' })
  @Index()
  toUserId: string;

  @Column({ name: 'from_wallet_id' })
  fromWalletId: string;

  @Column({ name: 'to_wallet_id' })
  toWalletId: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({
    type: 'enum',
    enum: InternalTransferStatus,
    default: InternalTransferStatus.PENDING,
  })
  status: InternalTransferStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255 })
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
