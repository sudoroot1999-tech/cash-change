import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('trades')
export class Trade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'pair_id', type: 'uuid' })
  pairId: string;

  @Column({ name: 'buyer_order_id', type: 'uuid' })
  buyerOrderId: string;

  @Column({ name: 'seller_order_id', type: 'uuid' })
  sellerOrderId: string;

  @Column({ name: 'buyer_id', type: 'uuid' })
  buyerId: string;

  @Column({ name: 'seller_id', type: 'uuid' })
  sellerId: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  price: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  quantity: string;

  @Column({ name: 'buyer_fee', type: 'decimal', precision: 36, scale: 18, default: '0' })
  buyerFee: string;

  @Column({ name: 'seller_fee', type: 'decimal', precision: 36, scale: 18, default: '0' })
  sellerFee: string;

  @Column({ name: 'is_buyer_maker', default: false })
  isBuyerMaker: boolean;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
