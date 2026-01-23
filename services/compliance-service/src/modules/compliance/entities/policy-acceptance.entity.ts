import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum PolicyType {
  TERMS_OF_SERVICE = 'terms_of_service',
  PRIVACY_POLICY = 'privacy_policy',
  AML_POLICY = 'aml_policy',
  COOKIE_POLICY = 'cookie_policy',
  RISK_DISCLOSURE = 'risk_disclosure',
  FEE_SCHEDULE = 'fee_schedule',
}

@Entity('policy_acceptances')
export class PolicyAcceptance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index(['user_id'])
  userId!: string;

  @Index(['policy_type'])
  @Column({
    name: 'policy_type',
    type: 'enum',
    enum: PolicyType,
  })
  policyType!: PolicyType;

  @Index(['policy_version'])
  @Column({ name: 'policy_version', type: 'varchar', length: 50 })
  policyVersion!: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string;

  @Column({ type: 'boolean', default: true })
  accepted!: boolean;

  @Index(['created_at'])
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
