import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('trading_pairs')
export class TradingPair {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'base_asset_id', type: 'uuid' })
  baseAssetId!: string;

  @Column({ name: 'quote_asset_id', type: 'uuid' })
  quoteAssetId!: string;

  @Column({ unique: true, length: 20 })
  symbol!: string;

  @Column({ default: 'active' })
  status!: string;

  @Column({ name: 'min_order_size', type: 'decimal', precision: 36, scale: 18 })
  minOrderSize!: string;

  @Column({ name: 'max_order_size', type: 'decimal', precision: 36, scale: 18 })
  maxOrderSize!: string;

  @Column({ name: 'price_precision', type: 'int', default: 8 })
  pricePrecision!: number;

  @Column({ name: 'quantity_precision', type: 'int', default: 8 })
  quantityPrecision!: number;

  @Column({ name: 'maker_fee', type: 'decimal', precision: 10, scale: 6, default: '0.001' })
  makerFee!: string;

  @Column({ name: 'taker_fee', type: 'decimal', precision: 10, scale: 6, default: '0.001' })
  takerFee!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
