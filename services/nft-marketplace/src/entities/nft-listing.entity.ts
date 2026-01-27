import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Nft } from './nft.entity';

export enum ListingType {
  FIXED_PRICE = 'FIXED_PRICE',
  AUCTION = 'AUCTION',
  BUNDLE = 'BUNDLE',
  DUTCH_AUCTION = 'DUTCH_AUCTION',
}

export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('nft_listings')
export class NftListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nft_id', type: 'uuid' })
  nftId: string;

  @ManyToOne(() => Nft, (nft) => nft.listings)
  @JoinColumn({ name: 'nft_id' })
  nft: Nft;

  @Column({ name: 'seller_address', length: 42 })
  sellerAddress: string;

  @Column({ name: 'listing_type', type: 'varchar', length: 20 })
  listingType: ListingType;

  @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
  price: string;

  @Column({ name: 'starting_price', type: 'decimal', precision: 36, scale: 18, nullable: true })
  startingPrice: string;

  @Column({ name: 'reserve_price', type: 'decimal', precision: 36, scale: 18, nullable: true })
  reservePrice: string;

  @Column({ name: 'ending_price', type: 'decimal', precision: 36, scale: 18, nullable: true })
  endingPrice: string;

  @Column({ name: 'currency_address', length: 42, nullable: true })
  currencyAddress: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: ListingStatus.ACTIVE })
  status: ListingStatus;

  @Column({ name: 'start_time', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ type: 'integer', nullable: true })
  duration: number;

  @Column({ type: 'text', nullable: true })
  signature: string;

  @Column({ name: 'chain_id', type: 'integer' })
  chainId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
