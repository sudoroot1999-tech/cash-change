import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  symbol: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50 })
  network: string;

  @Column({ name: 'contract_address', length: 255, nullable: true })
  contractAddress: string | null;

  @Column({ type: 'int', default: 18 })
  decimals: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'min_deposit', type: 'decimal', precision: 36, scale: 18, default: '0' })
  minDeposit: string;

  @Column({ name: 'min_withdrawal', type: 'decimal', precision: 36, scale: 18, default: '0' })
  minWithdrawal: string;

  @Column({ name: 'withdrawal_fee', type: 'decimal', precision: 36, scale: 18, default: '0' })
  withdrawalFee: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
