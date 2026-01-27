import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  REPAID = 'REPAID',
  LIQUIDATED = 'LIQUIDATED',
  DEFAULTED = 'DEFAULTED',
}

export enum CollateralType {
  CRYPTO = 'CRYPTO',
  NFT = 'NFT',
  LP_TOKEN = 'LP_TOKEN',
}

@Entity('loans')
@Index(['userId', 'status'])
@Index(['healthFactor'])
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'user_id' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  collateralAsset: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  collateralAmount: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  collateralValueUsd: string;

  @Column({ type: 'enum', enum: CollateralType, default: CollateralType.CRYPTO })
  collateralType: CollateralType;

  @Column({ type: 'varchar', nullable: true })
  nftTokenId: string;

  @Column({ type: 'varchar', nullable: true })
  nftContractAddress: string;

  @Column({ type: 'varchar', length: 20 })
  borrowedAsset: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  borrowedAmount: string;

  @Column({ type: 'decimal', precision: 30, scale: 18, default: '0' })
  accruedInterest: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  interestRate: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  healthFactor: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  ltvRatio: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: '75' })
  liquidationThreshold: string;

  @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.ACTIVE })
  status: LoanStatus;

  @Column({ type: 'timestamp', name: 'loan_start_date' })
  loanStartDate: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'loan_end_date' })
  loanEndDate: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_interest_update' })
  lastInterestUpdate: Date;

  @Column({ type: 'varchar', nullable: true })
  borrowTxHash: string;

  @Column({ type: 'varchar', nullable: true })
  repayTxHash: string;

  @Column({ type: 'varchar', nullable: true })
  liquidationTxHash: string;

  @Column({ type: 'varchar' })
  contractAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
