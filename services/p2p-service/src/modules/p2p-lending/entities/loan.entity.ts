import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { LoanRepayment } from './loan-repayment.entity';
import { CollateralMonitoring } from './collateral-monitoring.entity';

export enum LoanStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REPAID = 'REPAID',
  DEFAULTED = 'DEFAULTED',
  LIQUIDATED = 'LIQUIDATED',
  CANCELLED = 'CANCELLED',
}

export enum CollateralType {
  CRYPTO = 'CRYPTO',
  NFT = 'NFT',
}

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lender_id', type: 'uuid' })
  lenderId: string;

  @Column({ name: 'borrower_id', type: 'uuid' })
  borrowerId: string;

  // Principal
  @Column({ name: 'principal_amount', type: 'decimal', precision: 30, scale: 8 })
  principalAmount: string;

  @Column({ name: 'principal_currency', length: 10 })
  principalCurrency: string;

  // Collateral
  @Column({ name: 'collateral_amount', type: 'decimal', precision: 30, scale: 8 })
  collateralAmount: string;

  @Column({ name: 'collateral_currency', length: 10 })
  collateralCurrency: string;

  @Column({
    name: 'collateral_type',
    type: 'varchar',
    length: 20,
    default: CollateralType.CRYPTO,
  })
  collateralType: CollateralType;

  @Column({ name: 'collateral_wallet_address', nullable: true })
  collateralWalletAddress?: string;

  // Terms
  @Column({ name: 'interest_rate', type: 'decimal', precision: 10, scale: 4 })
  interestRate: string;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays: number;

  @Column({ name: 'ltv_ratio', type: 'decimal', precision: 10, scale: 4 })
  ltvRatio: string;

  @Column({
    name: 'liquidation_threshold',
    type: 'decimal',
    precision: 10,
    scale: 4,
    default: '150.00',
  })
  liquidationThreshold: string;

  // Status
  @Column({
    type: 'varchar',
    length: 20,
    default: LoanStatus.PENDING,
  })
  status: LoanStatus;

  // Dates
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'funded_at', type: 'timestamptz', nullable: true })
  fundedAt?: Date;

  @Column({ name: 'due_date', type: 'timestamptz' })
  dueDate: Date;

  @Column({ name: 'repaid_at', type: 'timestamptz', nullable: true })
  repaidAt?: Date;

  @Column({ name: 'liquidated_at', type: 'timestamptz', nullable: true })
  liquidatedAt?: Date;

  // Tracking
  @Column({
    name: 'total_paid',
    type: 'decimal',
    precision: 30,
    scale: 8,
    default: '0',
  })
  totalPaid: string;

  @Column({
    name: 'accrued_interest',
    type: 'decimal',
    precision: 30,
    scale: 8,
    default: '0',
  })
  accruedInterest: string;

  @Column({ name: 'last_interest_calculation', type: 'timestamptz', default: () => 'NOW()' })
  lastInterestCalculation: Date;

  // Blockchain
  @Column({ name: 'contract_address', nullable: true })
  contractAddress?: string;

  @Column({ name: 'loan_contract_id', nullable: true })
  loanContractId?: string;

  @Column({ name: 'creation_tx_hash', nullable: true })
  creationTxHash?: string;

  @Column({ name: 'repayment_tx_hash', nullable: true })
  repaymentTxHash?: string;

  @Column({ name: 'liquidation_tx_hash', nullable: true })
  liquidationTxHash?: string;

  // Metadata
  @Column({ name: 'loan_purpose', type: 'text', nullable: true })
  loanPurpose?: string;

  @Column({ name: 'terms_accepted_at', type: 'timestamptz', nullable: true })
  termsAcceptedAt?: Date;

  // Relations
  @OneToMany(() => LoanRepayment, (repayment) => repayment.loan)
  repayments: LoanRepayment[];

  @OneToMany(() => CollateralMonitoring, (monitoring) => monitoring.loan)
  collateralMonitoring: CollateralMonitoring[];
}
