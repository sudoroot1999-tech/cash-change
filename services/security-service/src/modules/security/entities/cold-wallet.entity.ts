import { COLD_WALLET_STATUS, COLD_WALLET_TYPES, ColdWalletStatus, ColdWalletType } from '@exchange/common';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';


@Entity('cold_wallets')
@Index(['currency', 'status'])
export class ColdWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  currency: string;

  @Column()
  address: string;

  @Column({
    type: 'enum',
    enum: COLD_WALLET_TYPES,
  })
  type: ColdWalletType;

  @Column({
    type: 'enum',
    enum: COLD_WALLET_STATUS,
    default: COLD_WALLET_STATUS.ACTIVE,
  })
  status: ColdWalletStatus;

  @Column({ name: 'multi_sig_config', type: 'jsonb', nullable: true })
  multiSigConfig: {
    requiredSignatures?: number;
    totalSigners?: number;
    signerAddresses?: string[];
  };

  @Column({ type: 'decimal', precision: 36, scale: 18, default: 0 })
  balance: string;

  @Column({ nullable: true })
  location: string;

  @Column({ name: 'last_audit_at', type: 'timestamp', nullable: true })
  lastAuditAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
