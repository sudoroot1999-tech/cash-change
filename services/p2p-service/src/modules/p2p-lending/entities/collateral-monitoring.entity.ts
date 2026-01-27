import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Loan } from './loan.entity';

@Entity('collateral_monitoring')
export class CollateralMonitoring {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'loan_id', type: 'uuid' })
  loanId: string;

  @ManyToOne(() => Loan, (loan) => loan.collateralMonitoring)
  @JoinColumn({ name: 'loan_id' })
  loan: Loan;

  // Current values
  @Column({
    name: 'collateral_value_usd',
    type: 'decimal',
    precision: 30,
    scale: 8,
  })
  collateralValueUsd: string;

  @Column({
    name: 'borrowed_value_usd',
    type: 'decimal',
    precision: 30,
    scale: 8,
  })
  borrowedValueUsd: string;

  @Column({ name: 'current_ltv', type: 'decimal', precision: 10, scale: 4 })
  currentLtv: string;

  @Column({ name: 'health_factor', type: 'decimal', precision: 10, scale: 4 })
  healthFactor: string;

  // Price data
  @Column({
    name: 'collateral_price_usd',
    type: 'decimal',
    precision: 30,
    scale: 8,
  })
  collateralPriceUsd: string;

  @Column({
    name: 'borrowed_price_usd',
    type: 'decimal',
    precision: 30,
    scale: 8,
  })
  borrowedPriceUsd: string;

  // Oracle data
  @Column({ name: 'oracle_source', length: 50, nullable: true })
  oracleSource?: string;

  @Column({ name: 'price_update_timestamp', type: 'timestamptz', nullable: true })
  priceUpdateTimestamp?: Date;

  // Liquidation tracking
  @Column({ name: 'is_at_risk', type: 'boolean', default: false })
  isAtRisk: boolean;

  @Column({ name: 'liquidation_warning_sent', type: 'boolean', default: false })
  liquidationWarningSent: boolean;

  // Timestamps
  @CreateDateColumn({ name: 'checked_at' })
  checkedAt: Date;
}
