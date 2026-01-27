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
import { P2pAd } from './p2p-ad.entity';

export enum TradeStatus {
  PENDING = 'pending', // Trade initiated, waiting for payment
  PAID = 'paid', // Buyer marked as paid, waiting seller confirmation
  COMPLETED = 'completed', // Seller released crypto
  CANCELLED = 'cancelled', // Trade cancelled
  DISPUTED = 'disputed', // Dispute opened
  REFUNDED = 'refunded', // Crypto refunded to seller (timeout or dispute)
  EXPIRED = 'expired', // Payment timeout
}

@Entity('p2p_trades')
@Index(['buyerId', 'status'])
@Index(['sellerId', 'status'])
@Index(['adId', 'status'])
@Index(['status', 'createdAt'])
@Index(['expiresAt'])
export class P2pTrade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ad_id' })
  @Index()
  adId: string;

  @ManyToOne(() => P2pAd)
  @JoinColumn({ name: 'ad_id' })
  ad: P2pAd;

  @Column({ name: 'buyer_id' })
  @Index()
  buyerId: string;

  @Column({ name: 'seller_id' })
  @Index()
  sellerId: string;

  @Column({
    name: 'crypto_asset',
    length: 10,
  })
  cryptoAsset: string;

  @Column({
    name: 'crypto_amount',
    type: 'decimal',
    precision: 18,
    scale: 8,
  })
  cryptoAmount: number;

  @Column({
    name: 'fiat_currency',
    length: 10,
  })
  fiatCurrency: string;

  @Column({
    name: 'fiat_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  fiatAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
  })
  price: number;

  @Column({
    name: 'payment_method',
    length: 50,
  })
  paymentMethod: string;

  @Column({
    name: 'payment_details',
    type: 'jsonb',
    nullable: true,
  })
  paymentDetails: any;

  @Column({
    name: 'payment_proof',
    type: 'simple-array',
    nullable: true,
  })
  paymentProof: string[]; // URLs to uploaded images/files

  @Column({
    name: 'payment_reference',
    nullable: true,
  })
  paymentReference: string;

  @Column({
    name: 'escrow_fee',
    type: 'decimal',
    precision: 18,
    scale: 8,
  })
  escrowFee: number;

  @Column({
    name: 'escrow_address',
    nullable: true,
  })
  escrowAddress: string;

  @Column({
    name: 'escrow_tx_hash',
    nullable: true,
  })
  escrowTxHash: string;

  @Column({
    name: 'release_tx_hash',
    nullable: true,
  })
  releaseTxHash: string;

  @Column({
    type: 'enum',
    enum: TradeStatus,
    default: TradeStatus.PENDING,
  })
  @Index()
  status: TradeStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string;

  @Column({
    name: 'seller_notes',
    type: 'text',
    nullable: true,
  })
  sellerNotes: string;

  @Column({
    name: 'paid_at',
    type: 'timestamp',
    nullable: true,
  })
  paidAt: Date;

  @Column({
    name: 'completed_at',
    type: 'timestamp',
    nullable: true,
  })
  completedAt: Date;

  @Column({
    name: 'cancelled_at',
    type: 'timestamp',
    nullable: true,
  })
  cancelledAt: Date;

  @Column({
    name: 'cancelled_by',
    nullable: true,
  })
  cancelledBy: string;

  @Column({
    name: 'cancellation_reason',
    type: 'text',
    nullable: true,
  })
  cancellationReason: string;

  @Column({
    name: 'expires_at',
    type: 'timestamp',
  })
  @Index()
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
