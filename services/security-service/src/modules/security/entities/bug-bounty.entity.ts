import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BugSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export enum BugBountyStatus {
  SUBMITTED = 'SUBMITTED',
  TRIAGING = 'TRIAGING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  RESOLVED = 'RESOLVED',
  REWARDED = 'REWARDED',
}

@Entity('bug_bounty_submissions')
@Index(['reporterId', 'status'])
export class BugBountySubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reporter_id' })
  @Index()
  reporterId: string;

  @Column({ name: 'reporter_email' })
  reporterEmail: string;

  @Column({ name: 'reporter_name', nullable: true })
  reporterName: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: BugSeverity,
  })
  severity: BugSeverity;

  @Column({
    type: 'enum',
    enum: BugBountyStatus,
    default: BugBountyStatus.SUBMITTED,
  })
  status: BugBountyStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  rewardAmount: number;

  @Column({ name: 'reward_currency', nullable: true })
  rewardCurrency: string;

  @Column({ name: 'poc_url', nullable: true })
  pocUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments: string[];

  @Column({ type: 'text', nullable: true })
  internalNotes: string;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'rewarded_at', type: 'timestamp', nullable: true })
  rewardedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
