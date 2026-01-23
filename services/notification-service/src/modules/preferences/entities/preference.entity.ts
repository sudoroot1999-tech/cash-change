import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, NotificationChannel, NotificationType } from '@exchange/common';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';


@Entity('notification_preferences')
export class UserNotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['user_id'])
  @Column({ name: 'user_id' })
  userId: string;

  @Index(['notification_type'])
  @Column({ type: 'enum', enum: NOTIFICATION_TYPES, name: 'notification_type' })
  notificationType: NotificationType;

  @Column({ type: 'enum', enum: NOTIFICATION_CHANNELS, array: true, name: 'enabled_channels' })
  enabledChannels: NotificationChannel[];

  @Column({ default: true, name: 'is_enabled' })
  isEnabled: boolean;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true, name: 'phone_number' })
  phoneNumber: string;

  @Column({ nullable: true, name: 'telegram_chat_id' })
  telegramChatId: string;

  @Column({ nullable: true, name: 'whatsapp_number' })
  whatsappNumber: string;

  @Column({ type: 'time', nullable: true, name: 'quietHours_start' })
  quietHoursStart: string;

  @Column({ type: 'time', nullable: true, name: 'quiet_hours_end' })
  quietHoursEnd: string;

  @Column({ type: 'varchar', length: 10, default: 'UTC' })
  timezone: string;

  @Column({ type: 'jsonb', nullable: true, name: 'custom_preferences' })
  customPreferences: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
