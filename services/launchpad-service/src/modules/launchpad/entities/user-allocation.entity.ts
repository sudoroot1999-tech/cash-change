import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { SaleRound } from './sale-round.entity';
import { TokenClaim } from './token-claim.entity';

export enum AllocationStatus {
  WHITELISTED = 'WHITELISTED',
  ALLOCATED = 'ALLOCATED',
  NOT_ALLOCATED = 'NOT_ALLOCATED',
  PURCHASED = 'PURCHASED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

@Entity('user_allocations')
@Index(['userId', 'saleRoundId'], { unique: true })
export class UserAllocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'uuid' })
  saleRoundId!: string;

  @ManyToOne(() => SaleRound, (saleRound) => saleRound.allocations)
  @JoinColumn({ name: 'saleRoundId' })
  saleRound!: SaleRound;

  @Column({
    type: 'enum',
    enum: AllocationStatus,
    default: AllocationStatus.WHITELISTED,
  })
  status!: AllocationStatus;

  @Column({ type: 'boolean', default: false })
  isWhitelisted!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  whitelistedAt?: Date;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  allocationAmount!: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  contributedAmount!: string;

  @Column({ type: 'decimal', precision: 30, scale: 0, default: 0 })
  tokenAmount!: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  stakingAmount?: string;

  @Column({ type: 'int', default: 1 })
  userTier!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  allocationMultiplier!: string;

  @Column({ type: 'boolean', default: false })
  isGuaranteedAllocation!: boolean;

  @Column({ type: 'boolean', default: false })
  wonLottery!: boolean;

  @Column({ type: 'int', nullable: true })
  lotteryTickets?: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lotteryHash?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionHash?: string;

  @Column({ type: 'timestamp', nullable: true })
  purchasedAt?: Date;

  @Column({ type: 'boolean', default: false })
  kycVerified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  kycVerifiedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    country?: string;
    referralCode?: string;
  };

  @OneToMany(() => TokenClaim, (claim) => claim.allocation)
  claims!: TokenClaim[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
