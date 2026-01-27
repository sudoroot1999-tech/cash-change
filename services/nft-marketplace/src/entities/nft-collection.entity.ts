import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Nft } from './nft.entity';

@Entity('nft_collections')
export class NftCollection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_address', unique: true, length: 42 })
  contractAddress: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50 })
  symbol: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'collection_type', length: 20 })
  collectionType: 'ERC721' | 'ERC1155';

  @Column({ name: 'creator_address', length: 42 })
  creatorAddress: string;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'banner_image_url', type: 'text', nullable: true })
  bannerImageUrl: string;

  @Column({ name: 'profile_image_url', type: 'text', nullable: true })
  profileImageUrl: string;

  @Column({ length: 50, nullable: true })
  category: string;

  @Column({ name: 'royalty_recipient', length: 42, nullable: true })
  royaltyRecipient: string;

  @Column({ name: 'royalty_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  royaltyPercentage: number;

  @Column({ name: 'total_supply', type: 'bigint', default: 0 })
  totalSupply: string;

  @Column({ name: 'floor_price', type: 'decimal', precision: 36, scale: 18, nullable: true })
  floorPrice: string;

  @Column({ name: 'total_volume', type: 'decimal', precision: 36, scale: 18, default: 0 })
  totalVolume: string;

  @Column({ name: 'chain_id', type: 'integer' })
  chainId: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @OneToMany(() => Nft, (nft) => nft.collection)
  nfts: Nft[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
