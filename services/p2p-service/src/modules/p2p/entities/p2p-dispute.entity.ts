import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { P2pTrade } from './p2p-trade.entity';

export enum DisputeStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum DisputeReason {
  PAYMENT_NOT_RECEIVED = 'payment_not_received',
  PAYMENT_ISSUE = 'payment_issue',
  WRONG_AMOUNT = 'wrong_amount',
  SCAM_ATTEMPT = 'scam_attempt',
  OTHER = 'other',
}

export enum DisputeResolution {
  BUYER_WINS = 'buyer_wins',
  SELLER_WINS = 'seller_wins',
  PARTIAL_REFUND = 'partial_refund',
  CANCELLED = 'cancelled',
}

@Entity('p2p_disputes')
@Index(['tradeId'])
@Index(['status', 'createdAt'])
@Index(['assignedTo'])
export class P2pDispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trade_id' })
  @Index()
  tradeId: string;

  @ManyToOne(() => P2pTrade)
  @JoinColumn({ name: 'trade_id' })
  trade: P2pTrade;

  @Column({ name: 'opened_by' })
  openedBy: string;

  @Column({
    type: 'enum',
    enum: DisputeReason,
  })
  reason: DisputeReason;

  @Column({
    type: 'text',
  })
  description: string;

  @Column({
    type: 'simple-array',
    nullable: true,
  })
  evidence: string[]; // URLs to uploaded evidence files

  @Column({
    type: 'enum',
    enum: DisputeStatus,
    default: DisputeStatus.OPEN,
  })
  @Index()
  status: DisputeStatus;

  @Column({
    name: 'assigned_to',
    nullable: true,
  })
  @Index()
  assignedTo: string; // Admin user ID

  @Column({
    name: 'admin_notes',
    type: 'text',
    nullable: true,
  })
  adminNotes: string;

  @Column({
    type: 'enum',
    enum: DisputeResolution,
    nullable: true,
  })
  resolution: DisputeResolution;

  @Column({
    name: 'resolution_notes',
    type: 'text',
    nullable: true,
  })
  resolutionNotes: string;

  @Column({
    name: 'resolved_at',
    type: 'timestamp',
    nullable: true,
  })
  resolvedAt: Date;

  @Column({
    name: 'resolved_by',
    nullable: true,
  })
  resolvedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
