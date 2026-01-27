import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum RequestType {
  OFFER = 'OFFER',   // Lender offering money
  REQUEST = 'REQUEST', // Borrower requesting money
}

export enum RequestStatus {
  OPEN = 'OPEN',
  MATCHED = 'MATCHED',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('loan_requests')
export class LoanRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'request_type', type: 'varchar', length: 10 })
  requestType: RequestType;

  // Amount details
  @Column({ name: 'principal_amount', type: 'decimal', precision: 30, scale: 8 })
  principalAmount: string;

  @Column({ name: 'principal_currency', length: 10 })
  principalCurrency: string;

  // Collateral (for borrowers)
  @Column({
    name: 'collateral_amount',
    type: 'decimal',
    precision: 30,
    scale: 8,
    nullable: true,
  })
  collateralAmount?: string;

  @Column({ name: 'collateral_currency', length: 10, nullable: true })
  collateralCurrency?: string;

  @Column({ name: 'collateral_type', length: 20, default: 'CRYPTO', nullable: true })
  collateralType?: string;

  @Column({
    name: 'proposed_ltv',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  proposedLtv?: string;

  // Terms
  @Column({
    name: 'min_interest_rate',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  minInterestRate?: string;

  @Column({
    name: 'max_interest_rate',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  maxInterestRate?: string;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays: number;

  // Matching criteria
  @Column({ name: 'min_credit_score', type: 'int', nullable: true })
  minCreditScore?: number;

  @Column({
    name: 'max_ltv_ratio',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  maxLtvRatio?: string;

  // Status
  @Column({ type: 'varchar', length: 20, default: RequestStatus.OPEN })
  status: RequestStatus;

  // Metadata
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'matched_at', type: 'timestamptz', nullable: true })
  matchedAt?: Date;

  @Column({ name: 'matched_request_id', type: 'uuid', nullable: true })
  matchedRequestId?: string;

  @ManyToOne(() => LoanRequest, { nullable: true })
  @JoinColumn({ name: 'matched_request_id' })
  matchedRequest?: LoanRequest;

  // Auto-matching
  @Column({ name: 'auto_match_enabled', type: 'boolean', default: true })
  autoMatchEnabled: boolean;
}
