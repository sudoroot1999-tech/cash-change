import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum VestingType {
  LINEAR = 'LINEAR',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  MILESTONE = 'MILESTONE',
}

@Entity('vesting_schedules')
@Index(['userId', 'projectId'])
export class VestingSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'uuid' })
  @Index()
  projectId!: string;

  @Column({ type: 'uuid' })
  allocationId!: string;

  @Column({
    type: 'enum',
    enum: VestingType,
    default: VestingType.LINEAR,
  })
  vestingType!: VestingType;

  @Column({ type: 'decimal', precision: 30, scale: 0 })
  totalAmount!: string;

  @Column({ type: 'decimal', precision: 30, scale: 0, default: 0 })
  claimedAmount!: string;

  @Column({ type: 'decimal', precision: 30, scale: 0 })
  remainingAmount!: string;

  @Column({ type: 'timestamp' })
  startTime!: Date;

  @Column({ type: 'timestamp' })
  endTime!: Date;

  @Column({ type: 'timestamp', nullable: true })
  cliffEndTime?: Date;

  @Column({ type: 'int', default: 0 })
  tgePercentage!: number;

  @Column({ type: 'decimal', precision: 30, scale: 0, default: 0 })
  tgeAmount!: string;

  @Column({ type: 'boolean', default: false })
  tgeClaimed!: boolean;

  @Column({ type: 'int' })
  totalPhases!: number;

  @Column({ type: 'int', default: 0 })
  claimedPhases!: number;

  @Column({ type: 'jsonb' })
  phases!: Array<{
    phase: number;
    percentage: number;
    amount: string;
    unlockTime: Date;
    claimed: boolean;
    claimedAt?: Date;
    transactionHash?: string;
  }>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastClaimedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
