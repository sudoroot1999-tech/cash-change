import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('kyc_audit_logs')
export class KycAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['user_id'])
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Index(['verification_request_id'])
  @Column({ type: 'uuid', nullable: true, name: 'verification_request_id' })
  verificationRequestId: string;

  @Column()
  action: string;

  @Index(['preformed_by'])
  @Column({ name: 'preformed_by' })
  performedBy: string;

  @Column({ default: 'USER', name: 'preformed_by_role' })
  performedByRole: string;

  @Column({ name: 'ip_address' })
  ipAddress: string;

  @Column({ nullable: true, name: 'user_agent' })
  userAgent: string;

  // Store the changes made (before/after)
  @Column({ type: 'jsonb', nullable: true })
  changes: any;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Index(['timestamp'])
  @CreateDateColumn()
  timestamp: Date;
}
