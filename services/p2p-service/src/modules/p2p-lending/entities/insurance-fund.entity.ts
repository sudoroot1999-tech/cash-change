import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('insurance_fund')
export class InsuranceFund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Fund details
  @Column({ name: 'asset_symbol', length: 10, unique: true })
  assetSymbol: string;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 30,
    scale: 8,
    default: 0,
  })
  totalAmount: string;

  @Column({
    name: 'reserved_amount',
    type: 'decimal',
    precision: 30,
    scale: 8,
    default: 0,
  })
  reservedAmount: string;

  @Column({
    name: 'available_amount',
    type: 'decimal',
    precision: 30,
    scale: 8,
    default: 0,
  })
  availableAmount: string;

  // Statistics
  @Column({
    name: 'total_claims_paid',
    type: 'decimal',
    precision: 30,
    scale: 8,
    default: 0,
  })
  claimsPaid: string;

  @Column({
    name: 'total_deposits',
    type: 'decimal',
    precision: 30,
    scale: 8,
    default: 0,
  })
  totalDeposits: string;

  @Column({ name: 'claim_count', type: 'int', default: 0 })
  claimCount: number;

  // Timestamps
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
