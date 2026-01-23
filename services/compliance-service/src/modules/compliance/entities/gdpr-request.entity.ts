import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum GDPRRequestType {
  DATA_EXPORT = 'data_export', // Right to data portability
  DATA_DELETE = 'data_delete', // Right to be forgotten
  DATA_ACCESS = 'data_access', // Right to access
  DATA_RECTIFICATION = 'data_rectification', // Right to rectification
  RESTRICT_PROCESSING = 'restrict_processing', // Right to restriction
  OBJECT_PROCESSING = 'object_processing', // Right to object
  WITHDRAW_CONSENT = 'withdraw_consent',
}

export enum GDPRRequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('gdpr_requests')
export class GDPRRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index(['user_id'])
  userId!: string;

  @Column({
    type: 'enum',
    enum: GDPRRequestType,
  })
  type!: GDPRRequestType;

  @Index(['status'])
  @Column({
    type: 'enum',
    enum: GDPRRequestStatus,
    default: GDPRRequestStatus.PENDING,
  })
  status!: GDPRRequestStatus;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, any> | null;

  @Column({ name: 'export_url', type: 'text', nullable: true })
  exportUrl!: string | null;

  @Column({ name: 'export_expires_at', type: 'timestamp', nullable: true })
  exportExpiresAt!: Date | null;

  @Column({ name: 'processed_by', type: 'uuid', nullable: true })
  processedBy!: string | null;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Index(['created_at'])
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
