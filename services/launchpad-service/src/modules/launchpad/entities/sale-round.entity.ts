import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { LaunchpadProject } from './launchpad-project.entity';
import { UserAllocation } from './user-allocation.entity';

export enum SaleType {
  FIXED_PRICE = 'FIXED_PRICE',
  DUTCH_AUCTION = 'DUTCH_AUCTION',
  SUBSCRIPTION = 'SUBSCRIPTION',
  LOTTERY = 'LOTTERY',
}

export enum SaleStatus {
  UPCOMING = 'UPCOMING',
  WHITELIST_OPEN = 'WHITELIST_OPEN',
  WHITELIST_CLOSED = 'WHITELIST_CLOSED',
  SALE_LIVE = 'SALE_LIVE',
  SALE_ENDED = 'SALE_ENDED',
  ALLOCATION_DONE = 'ALLOCATION_DONE',
  DISTRIBUTION_DONE = 'DISTRIBUTION_DONE',
  CANCELLED = 'CANCELLED',
}

export enum RoundType {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
  STRATEGIC = 'STRATEGIC',
  SEED = 'SEED',
}

@Entity('sale_rounds')
export class SaleRound {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => LaunchpadProject, (project) => project.saleRounds)
  @JoinColumn({ name: 'projectId' })
  project!: LaunchpadProject;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({
    type: 'enum',
    enum: RoundType,
  })
  roundType!: RoundType;

  @Column({
    type: 'enum',
    enum: SaleType,
  })
  saleType!: SaleType;

  @Column({
    type: 'enum',
    enum: SaleStatus,
    default: SaleStatus.UPCOMING,
  })
  status!: SaleStatus;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  tokenPrice!: string;

  @Column({ type: 'decimal', precision: 30, scale: 0 })
  tokenAllocation!: string;

  @Column({ type: 'decimal', precision: 30, scale: 0, default: 0 })
  tokensSold!: string;

  @Column({ type: 'decimal', precision: 20, scale: 2, default: 0 })
  totalRaised!: string;

  @Column({ type: 'varchar', length: 10 })
  paymentCurrency!: string;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  hardCap!: string;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  softCap!: string;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  minAllocation!: string;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  maxAllocation!: string;

  @Column({ type: 'timestamp' })
  whitelistStartTime!: Date;

  @Column({ type: 'timestamp' })
  whitelistEndTime!: Date;

  @Column({ type: 'timestamp' })
  saleStartTime!: Date;

  @Column({ type: 'timestamp' })
  saleEndTime!: Date;

  @Column({ type: 'timestamp', nullable: true })
  claimStartTime?: Date;

  @Column({ type: 'boolean', default: false })
  kycRequired!: boolean;

  @Column({ type: 'boolean', default: false })
  stakingRequired!: boolean;

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  minStakingAmount?: string;

  @Column({ type: 'int', nullable: true })
  minStakingDays?: number;

  @Column({ type: 'jsonb', nullable: true })
  tierMultipliers?: {
    tier1: number;
    tier2: number;
    tier3: number;
    tier4: number;
    tier5: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  vestingSchedule?: Array<{
    percentage: number;
    unlockTime: number; // timestamp or days after TGE
    description: string;
  }>;

  @Column({ type: 'boolean', default: false })
  isVestingEnabled!: boolean;

  @Column({ type: 'int', default: 0 })
  tgePercentage!: number;

  @Column({ type: 'int', default: 0 })
  vestingDuration!: number;

  @Column({ type: 'int', default: 0 })
  vestingCliff!: number;

  @Column({ type: 'int', default: 0 })
  whitelistCount!: number;

  @Column({ type: 'int', default: 0 })
  participantCount!: number;

  @Column({ type: 'int', default: 0 })
  winnerCount!: number;

  @Column({ type: 'boolean', default: false })
  isOversubscribed!: boolean;

  @Column({ type: 'boolean', default: false })
  lotteryCompleted!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contractAddress?: string;

  @Column({ type: 'jsonb', nullable: true })
  dutchAuctionConfig?: {
    startPrice: string;
    endPrice: string;
    priceDecreaseInterval: number; // in seconds
    priceDecreaseAmount: string;
  };

  @OneToMany(() => UserAllocation, (allocation) => allocation.saleRound)
  allocations!: UserAllocation[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
