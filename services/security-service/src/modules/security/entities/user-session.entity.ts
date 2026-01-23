import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_sessions')
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index(['user_id'])
  userId: string;

  @Column({ name: 'session_token', unique: true })
  @Index(['session_token'])
  sessionToken: string;

  @Index(['refresh_token'])
  @Column({ name: 'refresh_token', unique: true, nullable: true })
  refreshToken: string;

  @Column({ name: 'device_fingerprint', nullable: true })
  deviceFingerprint: string;

  @Column({ name: 'ip_address' })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    browser?: string;
    os?: string;
    device?: string;
    location?: string;
  };

  @Index()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Index()
  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'last_activity_at', type: 'timestamp' })
  lastActivityAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
