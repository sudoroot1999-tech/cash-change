import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Nft } from './nft.entity';

export enum LoanStatus {
  REQUESTED = 'REQUESTED',
  ACTIVE = 'ACTIVE',
  REPAID = 'REPAID',
  DEFAULTED = 'DEFAULTED',
  LIQUIDATED = 'LIQUIDATED',
  CANCELLED = 'CANCELLED',
}

@Entity('nft_loans')
export class NftLoan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nft_id', type: 'uuid' })
  nftId: string;

  @ManyToOne(() => Nft)
  @JoinColumn({ name: 'nft_id' })
  nft: Nft;

  @Column({ name: 'borrower_address', length: 42 })
  borrowerAddress: string;

  @Column({ name: 'lender_address', length: 42, nullable: true })
  lenderAddress: string;

  @Column({ name: 'loan_amount', type: 'decimal', precision: 36, scale: 18 })
  loanAmount: string;

  @Column({ name: 'loan_currency_address', length: 42, nullable: true })
  loanCurrencyAddress: string;

  @Column({ name: 'interest_rate', type: 'decimal', precision: 10, scale: 4 })
  interestRate: number;

  @Column({ name: 'loan_duration', type: 'integer' })
  loanDuration: number;

  @Column({ name: 'collateral_valuation', type: 'decimal', precision: 36, scale: 18, nullable: true })
  collateralValuation: string;

  @Column({ name: 'ltv_ratio', type: 'decimal', precision: 5, scale: 2, nullable: true })
  ltvRatio: number;

  @Column({ name: 'start_time', type: 'timestamp', nullable: true })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ name: 'repayment_amount', type: 'decimal', precision: 36, scale: 18, nullable: true })
  repaymentAmount: string;

  @Column({ type: 'varchar', length: 20, default: LoanStatus.REQUESTED })
  status: LoanStatus;

  @Column({ name: 'chain_id', type: 'integer' })
  chainId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
