import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CreditGrade {
  A_PLUS = 'A+',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  F = 'F',
}

@Entity('credit_scores')
export class CreditScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  // Score (0-1000)
  @Column({ type: 'int', default: 500 })
  score: number;

  @Column({ type: 'varchar', length: 5, default: CreditGrade.C })
  grade: CreditGrade;

  // Components (weighted)
  @Column({
    name: 'repayment_history_score',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  repaymentHistoryScore: string; // 40%

  @Column({
    name: 'credit_utilization_score',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  creditUtilizationScore: string; // 20%

  @Column({
    name: 'account_age_score',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  accountAgeScore: string; // 15%

  @Column({
    name: 'loan_diversity_score',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  loanDiversityScore: string; // 10%

  @Column({
    name: 'defaults_score',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  defaultsScore: string; // 10%

  @Column({
    name: 'onchain_activity_score',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  onchainActivityScore: string; // 5%

  // Statistics
  @Column({ name: 'total_loans', type: 'int', default: 0 })
  totalLoans: number;

  @Column({ name: 'completed_loans', type: 'int', default: 0 })
  completedLoans: number;

  @Column({ name: 'defaulted_loans', type: 'int', default: 0 })
  defaultedLoans: number;

  @Column({
    name: 'total_borrowed',
    type: 'decimal',
    precision: 30,
    scale: 8,
    default: 0,
  })
  totalBorrowed: string;

  @Column({
    name: 'total_repaid',
    type: 'decimal',
    precision: 30,
    scale: 8,
    default: 0,
  })
  totalRepaid: string;

  @Column({ name: 'on_time_payments', type: 'int', default: 0 })
  onTimePayments: number;

  @Column({ name: 'late_payments', type: 'int', default: 0 })
  latePayments: number;

  @Column({ name: 'avg_ltv', type: 'decimal', precision: 10, scale: 4, default: 0 })
  avgLtv: string;

  // Timestamps
  @Column({ name: 'calculated_at', type: 'timestamptz', default: () => 'NOW()' })
  calculatedAt: Date;

  @Column({ name: 'last_loan_at', type: 'timestamptz', nullable: true })
  lastLoanAt?: Date;

  // Account age (in days)
  @Column({ name: 'account_age_days', type: 'int', default: 0 })
  accountAgeDays: number;
}
