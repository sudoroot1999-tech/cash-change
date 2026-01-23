import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('trusted_devices')
export class TrustedDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index(['user_id'], { unique: true })
  userId: string;

  @Column({ name: 'device_name', nullable: true })
  deviceName: string;

  @Index({ unique: true })
  @Column({ name: 'fingerprint' })
  fingerprint: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    browser?: string;
    os?: string;
    device?: string;
    screenResolution?: string;
    timezone?: string;
    language?: string;
  };

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'location', nullable: true })
  location: string;

  @Column({ name: 'country_code', nullable: true })
  countryCode: string;

  @Column({ name: 'city', nullable: true })
  city: string;

  @Index()
  @Column({ name: 'is_trusted', default: false })
  isTrusted: boolean;

  @Index()
  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
