import { COMPLIANCE_CHECK_STATUS, COMPLIANCE_CHECK_TYPE, ComplianceCheckStatus, ComplianceCheckType } from '@exchange/common';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('compliance_checks')
export class ComplianceCheck {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index(['user_id'])
  userId!: string;

  @Index(['type'])
  @Column({
    type: 'enum',
    enum: COMPLIANCE_CHECK_TYPE,
  })
  type!: ComplianceCheckType;

  @Index(['status'])
  @Column({
    type: 'enum',
    enum: COMPLIANCE_CHECK_STATUS,
    default: COMPLIANCE_CHECK_STATUS.PENDING,
  })
  status!: ComplianceCheckStatus;

  @Column({ type: 'jsonb', nullable: true })
  data!: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  result!: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  reason!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  provider!: string;

  @Column({ name: 'provider_reference_id', type: 'varchar', length: 255, nullable: true })
  providerReferenceId!: string;

  @Column({ name: 'risk_score', type: 'integer', nullable: true })
  riskScore!: number;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt!: Date;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy!: string;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt!: Date;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
