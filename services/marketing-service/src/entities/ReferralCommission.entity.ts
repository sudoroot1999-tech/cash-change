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
import { Referral } from './Referral.entity';

export enum CommissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum CommissionTrigger {
  REGISTRATION = 'registration',
  FIRST_DEPOSIT = 'first_deposit',
  FIRST_TRADE = 'first_trade',
  TRADE_VOLUME = 'trade_volume',
  SUBSCRIPTION = 'subscription',
  RECURRING = 'recurring',
}

@Entity('referral_commissions')
@Index(['referralId'])
@Index(['userId', 'status'])
@Index(['status', 'createdAt'])
export class ReferralCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  referralId: string;

  @ManyToOne(() => Referral)
  @JoinColumn({ name: 'referralId' })
  referral: Referral;

  @Column({ type: 'uuid' })
  userId: string; // Referrer receiving commission

  @Column({ type: 'uuid' })
  referredUserId: string; // User who generated the commission

  @Column({
    type: 'enum',
    enum: CommissionStatus,
    default: CommissionStatus.PENDING,
  })
  status: CommissionStatus;

  @Column({
    type: 'enum',
    enum: CommissionTrigger,
  })
  trigger: CommissionTrigger;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  amount: number;

  @Column({ type: 'varchar', length: 20 })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  baseAmount: number; // Original amount that generated commission

  @Column({ type: 'integer', default: 1 })
  tier: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionId: string; // Reference to trade or transaction

  @Column({ type: 'varchar', length: 100, nullable: true })
  payoutTransactionId: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  payoutDetails: {
    method?: string;
    walletAddress?: string;
    bankAccount?: string;
    txHash?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
