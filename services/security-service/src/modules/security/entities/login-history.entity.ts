import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { LOGIN_STATUS, LoginStatus } from '@exchange/common';

@Entity('login_history')
@Index(['userId', 'createdAt'])
export class LoginHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: Object.values(LOGIN_STATUS),
  })
  status: LoginStatus;

  @Column({ name: 'ip_address' })
  ipAddress: string;

  @Column({ nullable: true })
  location: string;

  @Column({ name: 'country_code', nullable: true })
  countryCode: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  latitude: string;

  @Column({ nullable: true })
  longitude: string;

  @Column({ name: 'device_fingerprint', nullable: true })
  deviceFingerprint: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    browser?: string;
    os?: string;
    device?: string;
    isTrustedDevice?: boolean;
    isNewDevice?: boolean;
  };

  @Column({ name: 'failure_reason', nullable: true })
  failureReason: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
