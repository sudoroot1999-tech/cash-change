import { BUG_SEVERITY, BUGBOUNTY_STATUS, BugBountyStatus, BugSeverity } from '@exchange/common';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('bug_bounty_submissions')
export class BugBountySubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reporter_id' })
  @Index(['reporter_id'])
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
    enum: BUG_SEVERITY,
  })
  severity: BugSeverity;

  @Index()
  @Column({
    type: 'enum',
    enum: BUGBOUNTY_STATUS,
    default: BUGBOUNTY_STATUS.SUBMITTED,
  })
  status: BugBountyStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'reward_amount' })
  rewardAmount: number;

  @Column({ name: 'reward_currency', nullable: true })
  rewardCurrency: string;

  @Column({ name: 'poc_url', nullable: true })
  pocUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments: string[];

  @Column({ type: 'text', nullable: true, name: 'internal_notes' })
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
