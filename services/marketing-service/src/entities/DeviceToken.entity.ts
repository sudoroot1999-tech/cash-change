import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('device_tokens')
@Index(['userId'])
@Index(['token'], { unique: true })
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 500, unique: true })
  token: string;

  @Column({ type: 'varchar', length: 20 })
  platform: string; // ios, android, web

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceModel: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  osVersion: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  appVersion: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  isOptedIn: boolean;

  // Notification preferences
  @Column({ type: 'jsonb', default: {} })
  preferences: {
    marketing?: boolean;
    transactional?: boolean;
    priceAlerts?: boolean;
    tradingSignals?: boolean;
    news?: boolean;
    promotions?: boolean;
  };

  @Column({ type: 'varchar', length: 10, nullable: true })
  language: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone: string;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'integer', default: 0 })
  totalNotificationsSent: number;

  @Column({ type: 'integer', default: 0 })
  totalNotificationsClicked: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
