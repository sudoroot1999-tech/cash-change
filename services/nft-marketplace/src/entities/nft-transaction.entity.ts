import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Nft } from './nft.entity';
import { NftCollection } from './nft-collection.entity';

export enum TransactionType {
  MINT = 'MINT',
  TRANSFER = 'TRANSFER',
  SALE = 'SALE',
  AUCTION = 'AUCTION',
  BURN = 'BURN',
  OFFER = 'OFFER',
  BID = 'BID',
}

@Entity('nft_transactions')
export class NftTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nft_id', type: 'uuid', nullable: true })
  nftId: string;

  @ManyToOne(() => Nft)
  @JoinColumn({ name: 'nft_id' })
  nft: Nft;

  @Column({ name: 'collection_id', type: 'uuid', nullable: true })
  collectionId: string;

  @ManyToOne(() => NftCollection)
  @JoinColumn({ name: 'collection_id' })
  collection: NftCollection;

  @Column({ name: 'transaction_type', type: 'varchar', length: 20 })
  transactionType: TransactionType;

  @Column({ name: 'from_address', length: 42, nullable: true })
  fromAddress: string;

  @Column({ name: 'to_address', length: 42, nullable: true })
  toAddress: string;

  @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
  price: string;

  @Column({ name: 'currency_address', length: 42, nullable: true })
  currencyAddress: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ name: 'tx_hash', length: 66 })
  txHash: string;

  @Column({ name: 'block_number', type: 'bigint', nullable: true })
  blockNumber: string;

  @Column({ name: 'chain_id', type: 'integer' })
  chainId: number;

  @Column({ name: 'gas_used', type: 'bigint', nullable: true })
  gasUsed: string;

  @Column({ name: 'gas_price', type: 'decimal', precision: 36, scale: 18, nullable: true })
  gasPrice: string;

  @Column({ name: 'marketplace_fee', type: 'decimal', precision: 36, scale: 18, nullable: true })
  marketplaceFee: string;

  @Column({ name: 'royalty_fee', type: 'decimal', precision: 36, scale: 18, nullable: true })
  royaltyFee: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
