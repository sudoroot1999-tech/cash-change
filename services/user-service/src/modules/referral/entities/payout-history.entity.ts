import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('payout_history')
export class PayoutHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['user_id'])
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 20 })
  currency: string;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  // PAYOUT_HISTORY_STATUS

  @Column({ type: 'varchar', length: 50, name: 'payment_method' })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'transaction_id' })
  transactionId: string;

  @Column({ type: 'int', default: 0, name: 'commission_count' })
  commissionCount: number;

  @Column({ type: 'timestamp', name: 'period_start' })
  periodStart: Date;

  @Column({ type: 'timestamp', name: 'period_end' })
  periodEnd: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'net_amount' })
  netAmount: number;

  @Column({ type: 'jsonb', nullable: true, name: 'payment_details' })
  paymentDetails: {
    bankAccount?: string;
    walletAddress?: string;
    cryptoCurrency?: string;
    paypalEmail?: string;
  };

  @Column({ type: 'text', nullable: true, name: 'failure_reason' })
  failureReason: string;

  @Column({ type: 'timestamp', nullable: true, name: 'processed_at' })
  processedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'jsonb', nullable: true, name: 'tax_information' })
  taxInformation: {
    taxRate?: number;
    taxAmount?: number;
    taxId?: string;
    taxDocumentUrl?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    processedBy?: string;
    notes?: string;
    invoiceUrl?: string;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
