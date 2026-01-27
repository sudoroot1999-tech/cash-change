import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('token_prices')
@Index(['timestamp'])
@Index(['source'])
export class TokenPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  price: string; // Price in USD

  @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
  priceEth: string; // Price in ETH

  @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
  priceBnb: string; // Price in BNB

  @Column({ type: 'bigint' })
  volume24h: string;

  @Column({ name: 'market_cap', type: 'decimal', precision: 36, scale: 18 })
  marketCap: string;

  @Column({ name: 'circulating_supply', type: 'decimal', precision: 36, scale: 18 })
  circulatingSupply: string;

  @Column({ type: 'varchar', length: 50 })
  source: string; // e.g., 'uniswap', 'pancakeswap', 'oracle'

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
