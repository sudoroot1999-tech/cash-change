import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export enum AddressType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  CHANGE = 'CHANGE',
  MULTISIG = 'MULTISIG',
}

export enum AddressChain {
  BITCOIN = 'BITCOIN',
  ETHEREUM = 'ETHEREUM',
  BSC = 'BSC',
  POLYGON = 'POLYGON',
  SOLANA = 'SOLANA',
}

@Entity('addresses')
@Index(['address', 'chain'], { unique: true })
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id' })
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.addresses)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  address: string;

  @Column({
    type: 'enum',
    enum: AddressChain,
  })
  chain: AddressChain;

  @Column({
    type: 'enum',
    enum: AddressType,
    default: AddressType.DEPOSIT,
  })
  type: AddressType;

  @Column({ name: 'derivation_index', type: 'int', nullable: true })
  derivationIndex: number;

  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'label', type: 'varchar', length: 255, nullable: true })
  label: string;

  @Column({ name: 'multisig_config', type: 'jsonb', nullable: true })
  multisigConfig: {
    requiredSignatures: number;
    totalSigners: number;
    signers: string[];
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
