import { RISK_LEVELS, RiskLevel, SECURITY_EVENT_TYPES, SecurityEventType } from '@exchange/common';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('security_events')
export class SecurityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index(['user_id'])
  userId: string;

  @Index(['event_type'])
  @Column({
    name: 'event_type',
    type: 'enum',
    enum: SECURITY_EVENT_TYPES,
  })
  eventType: SecurityEventType;

  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: RISK_LEVELS,
    default: RISK_LEVELS.LOW,
  })
  riskLevel: RiskLevel;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'device_fingerprint', nullable: true })
  deviceFingerprint: string;

  @Column({ type: 'jsonb' })
  details: Record<string, any>;

  @Column({ name: 'action_taken', nullable: true })
  actionTaken: string;

  @Column({ name: 'notified', default: false })
  notified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
