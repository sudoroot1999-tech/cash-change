import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserAllocation } from './user-allocation.entity';

export enum ClaimStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('token_claims')
@Index(['userId', 'allocationId'])
export class TokenClaim {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'uuid' })
  allocationId!: string;

  @ManyToOne(() => UserAllocation, (allocation) => allocation.claims)
  @JoinColumn({ name: 'allocationId' })
  allocation!: UserAllocation;

  @Column({ type: 'int' })
  vestingPhase!: number;

  @Column({ type: 'decimal', precision: 30, scale: 0 })
  claimableAmount!: string;

  @Column({ type: 'decimal', precision: 30, scale: 0, default: 0 })
  claimedAmount!: string;

  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.PENDING,
  })
  status!: ClaimStatus;

  @Column({ type: 'timestamp' })
  unlockTime!: Date;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionHash?: string;

  @Column({ type: 'varchar', length: 100 })
  walletAddress!: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
