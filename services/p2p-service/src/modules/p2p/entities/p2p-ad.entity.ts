import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AdType {
  BUY = 'buy',
  SELL = 'sell',
}

export enum AdStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAUSED = 'paused',
  DELETED = 'deleted',
}

export enum PaymentMethodType {
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  PAYPAL = 'paypal',
  WISE = 'wise',
  VENMO = 'venmo',
  ZELLE = 'zelle',
  WESTERN_UNION = 'western_union',
  MONEYGRAM = 'moneygram',
  OTHER = 'other',
}

@Entity('p2p_ads')
@Index(['userId', 'status'])
@Index(['cryptoAsset', 'fiatCurrency', 'type', 'status'])
@Index(['createdAt'])
export class P2pAd {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: AdType,
  })
  type: AdType;

  @Column({ name: 'crypto_asset', length: 10 })
  cryptoAsset: string; // BTC, ETH, USDT, etc.

  @Column({ name: 'fiat_currency', length: 10 })
  fiatCurrency: string; // IRR, USD, EUR, etc.

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  price: number;

  @Column({
    name: 'price_type',
    length: 20,
    default: 'fixed',
  })
  priceType: string; // fixed, floating

  @Column({
    name: 'margin_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  marginPercentage: number; // For floating prices

  @Column({
    name: 'min_limit',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  minLimit: number;

  @Column({
    name: 'max_limit',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  maxLimit: number;

  @Column({
    name: 'available_amount',
    type: 'decimal',
    precision: 18,
    scale: 8,
  })
  availableAmount: number;

  @Column({
    name: 'payment_methods',
    type: 'simple-array',
  })
  paymentMethods: string[];

  @Column({
    name: 'payment_time_limit',
    type: 'int',
    default: 30,
  })
  paymentTimeLimit: number; // minutes

  @Column({
    name: 'auto_reply',
    type: 'text',
    nullable: true,
  })
  autoReply: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  terms: string;

  @Column({
    name: 'min_buyer_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  minBuyerRating: number;

  @Column({
    name: 'require_verification',
    type: 'boolean',
    default: false,
  })
  requireVerification: boolean;

  @Column({
    name: 'require_id_verification',
    type: 'boolean',
    default: false,
  })
  requireIdVerification: boolean;

  @Column({
    type: 'simple-array',
    nullable: true,
  })
  blacklist: string[]; // User IDs

  @Column({
    type: 'enum',
    enum: AdStatus,
    default: AdStatus.ACTIVE,
  })
  status: AdStatus;

  @Column({
    name: 'total_trades',
    type: 'int',
    default: 0,
  })
  totalTrades: number;

  @Column({
    name: 'completed_trades',
    type: 'int',
    default: 0,
  })
  completedTrades: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
