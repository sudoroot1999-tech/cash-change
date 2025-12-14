import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique,
} from 'typeorm';

@Entity('wallets')
@Unique(['userId', 'assetId'])
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId!: string;

  @Column({ nullable: true, length: 255 })
  address!: string | null;

  @Column({ name: 'available_balance', type: 'decimal', precision: 36, scale: 18, default: '0' })
  availableBalance!: string;

  @Column({ name: 'locked_balance', type: 'decimal', precision: 36, scale: 18, default: '0' })
  lockedBalance!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
