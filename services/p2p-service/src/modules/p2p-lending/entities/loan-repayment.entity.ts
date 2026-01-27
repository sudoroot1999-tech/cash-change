import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Loan } from './loan.entity';

@Entity('loan_repayments')
export class LoanRepayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'loan_id', type: 'uuid' })
  loanId: string;

  @ManyToOne(() => Loan, (loan) => loan.repayments)
  @JoinColumn({ name: 'loan_id' })
  loan: Loan;

  // Payment details
  @Column({ type: 'decimal', precision: 30, scale: 8 })
  amount: string;

  @Column({ name: 'principal_paid', type: 'decimal', precision: 30, scale: 8 })
  principalPaid: string;

  @Column({ name: 'interest_paid', type: 'decimal', precision: 30, scale: 8 })
  interestPaid: string;

  // Blockchain
  @Column({ name: 'transaction_hash' })
  transactionHash: string;

  @Column({ name: 'block_number', type: 'bigint', nullable: true })
  blockNumber?: number;

  // Timestamps
  @CreateDateColumn({ name: 'paid_at' })
  paidAt: Date;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt?: Date;

  // Metadata
  @Column({ name: 'payment_method', length: 50, nullable: true })
  paymentMethod?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
