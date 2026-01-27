import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { NftCollection } from './nft-collection.entity';
import { NftListing } from './nft-listing.entity';

@Entity('nfts')
@Index(['contractAddress', 'tokenId'], { unique: true })
export class Nft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'collection_id', type: 'uuid', nullable: true })
  collectionId: string;

  @ManyToOne(() => NftCollection, (collection) => collection.nfts)
  @JoinColumn({ name: 'collection_id' })
  collection: NftCollection;

  @Column({ name: 'token_id', length: 78 })
  tokenId: string;

  @Column({ name: 'contract_address', length: 42 })
  contractAddress: string;

  @Column({ name: 'owner_address', length: 42 })
  ownerAddress: string;

  @Column({ name: 'creator_address', length: 42 })
  creatorAddress: string;

  @Column({ name: 'metadata_uri', type: 'text' })
  metadataUri: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string;

  @Column({ name: 'animation_url', type: 'text', nullable: true })
  animationUrl: string;

  @Column({ name: 'external_url', type: 'text', nullable: true })
  externalUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  attributes: any;

  @Column({ name: 'rarity_score', type: 'decimal', precision: 10, scale: 4, nullable: true })
  rarityScore: number;

  @Column({ name: 'rarity_rank', type: 'integer', nullable: true })
  rarityRank: number;

  @Column({ name: 'is_minted', default: false })
  isMinted: boolean;

  @Column({ name: 'is_lazy_minted', default: false })
  isLazyMinted: boolean;

  @Column({ name: 'mint_signature', type: 'text', nullable: true })
  mintSignature: string;

  @Column({ name: 'mint_voucher', type: 'jsonb', nullable: true })
  mintVoucher: any;

  @Column({ name: 'is_fractional', default: false })
  isFractional: boolean;

  @Column({ name: 'total_fractions', type: 'bigint', nullable: true })
  totalFractions: string;

  @Column({ name: 'is_staked', default: false })
  isStaked: boolean;

  @Column({ name: 'is_collateral', default: false })
  isCollateral: boolean;

  @Column({ name: 'loan_id', type: 'uuid', nullable: true })
  loanId: string;

  @Column({ name: 'chain_id', type: 'integer' })
  chainId: number;

  @Column({ name: 'last_sale_price', type: 'decimal', precision: 36, scale: 18, nullable: true })
  lastSalePrice: string;

  @Column({ name: 'views_count', type: 'integer', default: 0 })
  viewsCount: number;

  @Column({ name: 'favorites_count', type: 'integer', default: 0 })
  favoritesCount: number;

  @OneToMany(() => NftListing, (listing) => listing.nft)
  listings: NftListing[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
