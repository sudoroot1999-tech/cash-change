import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TaxReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CostBasisMethod {
  FIFO = 'FIFO', // First In First Out
  LIFO = 'LIFO', // Last In First Out
  HIFO = 'HIFO', // Highest In First Out
  AVERAGE = 'AVERAGE', // Average Cost
  SPECIFIC_ID = 'SPECIFIC_ID', // Specific Identification
}

@Entity('tax_reports')
export class TaxReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index(['user_id'])
  userId!: string;

  @Index(['tax_year'])
  @Column({ name: 'tax_year', type: 'integer' })
  taxYear!: number;

  @Index(['status'])
  @Column({
    type: 'enum',
    enum: TaxReportStatus,
    default: TaxReportStatus.PENDING,
  })
  status!: TaxReportStatus;

  @Column({
    name: 'cost_basis_method',
    type: 'enum',
    enum: CostBasisMethod,
    default: CostBasisMethod.FIFO,
  })
  costBasisMethod!: CostBasisMethod;

  @Column({ name: 'total_transactions', type: 'integer', default: 0 })
  totalTransactions!: number;

  @Column({ name: 'total_gains', type: 'decimal', precision: 20, scale: 8, default: 0 })
  totalGains!: number;

  @Column({ name: 'total_losses', type: 'decimal', precision: 20, scale: 8, default: 0 })
  totalLosses!: number;

  @Column({ name: 'net_capital_gain', type: 'decimal', precision: 20, scale: 8, default: 0 })
  netCapitalGain!: number;

  @Column({ name: 'short_term_gains', type: 'decimal', precision: 20, scale: 8, default: 0 })
  shortTermGains!: number;

  @Column({ name: 'long_term_gains', type: 'decimal', precision: 20, scale: 8, default: 0 })
  longTermGains!: number;

  @Column({ name: 'total_income', type: 'decimal', precision: 20, scale: 8, default: 0 })
  totalIncome!: number;

  @Column({ type: 'jsonb', nullable: true })
  transactions!: Array<{
    date: Date;
    type: string;
    asset: string;
    amount: number;
    costBasis: number;
    proceeds: number;
    gainLoss: number;
  }>;

  @Column({ name: 'report_url_csv', type: 'text', nullable: true })
  reportUrlCsv!: string;

  @Column({ name: 'report_url_pdf', type: 'text', nullable: true })
  reportUrlPdf!: string;

  @Column({ name: 'form_8949_url', type: 'text', nullable: true })
  form8949Url!: string;

  @Column({ name: 'schedule_d_url', type: 'text', nullable: true })
  scheduleDUrl!: string;

  @Column({ name: 'generated_at', type: 'timestamp', nullable: true })
  generatedAt!: Date;

  @Column({ name: 'exported_to_cointracker', type: 'boolean', default: false })
  exportedToCointracker!: boolean;

  @Column({ name: 'exported_to_koinly', type: 'boolean', default: false })
  exportedToKoinly!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
