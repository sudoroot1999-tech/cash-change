import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum VestingCategory {
  TEAM = 'TEAM',
  ADVISOR = 'ADVISOR',
  PRIVATE_SALE = 'PRIVATE_SALE',
  PUBLIC_SALE = 'PUBLIC_SALE',
  ECOSYSTEM = 'ECOSYSTEM',
}

export enum VestingStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  REVOKED = 'REVOKED',
}

@Entity('vesting_schedules')
@Index(['userId', 'status'])
@Index(['category'])
export class VestingSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'schedule_id', type: 'varchar', length: 66 })
  @Index({ unique: true })
  scheduleId: string; // On-chain schedule ID

  @Column({
    type: 'enum',
    enum: VestingCategory,
  })
  category: VestingCategory;

  @Column({ name: 'total_amount', type: 'decimal', precision: 36, scale: 18 })
  totalAmount: string;

  @Column({ name: 'released_amount', type: 'decimal', precision: 36, scale: 18, default: 0 })
  releasedAmount: string;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'cliff_duration', type: 'int' })
  cliffDuration: number; // in seconds

  @Column({ name: 'vesting_duration', type: 'int' })
  vestingDuration: number; // in seconds

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @Column({ type: 'boolean', default: true })
  revocable: boolean;

  @Column({
    type: 'enum',
    enum: VestingStatus,
    default: VestingStatus.ACTIVE,
  })
  status: VestingStatus;

  @Column({ name: 'last_claim_time', type: 'timestamp', nullable: true })
  lastClaimTime: Date;

  @Column({ name: 'wallet_address', type: 'varchar', length: 42 })
  walletAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
