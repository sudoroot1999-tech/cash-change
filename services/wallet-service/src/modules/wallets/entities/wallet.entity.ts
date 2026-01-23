import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Address } from './address.entity';
import { Transaction } from './transaction.entity';

export enum WalletType {
  HOT = 'HOT',
  COLD = 'COLD',
}

@Entity('wallets')
@Index(['userId', 'currency'], { unique: true })
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({ type: 'decimal', precision: 36, scale: 18, default: '0' })
  balance: string;

  @Column({
    name: 'locked_balance',
    type: 'decimal',
    precision: 36,
    scale: 18,
    default: '0',
  })
  lockedBalance: string;

  @Column({
    type: 'enum',
    enum: WalletType,
    default: WalletType.HOT,
  })
  type: WalletType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'master_public_key', type: 'text', nullable: true })
  masterPublicKey: string;

  @Column({ name: 'derivation_path', type: 'varchar', length: 255, nullable: true })
  derivationPath: string;

  @Column({ name: 'address_index', type: 'int', default: 0 })
  addressIndex: number;

  @OneToMany(() => Address, (address) => address.wallet)
  addresses: Address[];

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
