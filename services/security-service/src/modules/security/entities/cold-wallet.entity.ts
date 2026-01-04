import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ColdWalletType {
  MULTI_SIG = 'MULTI_SIG',
  HARDWARE = 'HARDWARE',
  PAPER = 'PAPER',
  OFFLINE = 'OFFLINE',
}

export enum ColdWalletStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
}

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
    enum: ColdWalletType,
  })
  type: ColdWalletType;

  @Column({
    type: 'enum',
    enum: ColdWalletStatus,
    default: ColdWalletStatus.ACTIVE,
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
