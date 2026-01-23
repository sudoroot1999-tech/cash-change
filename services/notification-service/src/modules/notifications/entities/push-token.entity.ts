import { DEVICE_PLATFORM, DevicePlatform } from '@exchange/common';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';


@Entity('push_tokens')
export class PushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['user_id'])
  @Column({ name: 'user_id' })
  userId: string;

  @Index(['token'], { unique: true, })
  @Column({ type: 'text' })
  token: string;

  @Index(['platform'])
  @Column({ type: 'enum', enum: DEVICE_PLATFORM })
  platform: DevicePlatform;

  @Column({ nullable: true, name: 'device_id' })
  deviceId: string;

  @Column({ nullable: true, name: 'device_name' })
  deviceName: string;

  @Column({ nullable: true, name: 'app_version' })
  appVersion: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_used_at' })
  lastUsedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
