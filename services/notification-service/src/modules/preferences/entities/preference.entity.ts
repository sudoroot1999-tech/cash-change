import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { NotificationChannel, NotificationType } from '../../notifications/entities/notification.entity';

@Entity('notification_preferences')
@Index(['userId'])
export class UserNotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: NotificationType })
  notificationType: NotificationType;

  @Column({ type: 'enum', enum: NotificationChannel, array: true })
  enabledChannels: NotificationChannel[];

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  telegramChatId: string;

  @Column({ nullable: true })
  whatsappNumber: string;

  @Column({ type: 'time', nullable: true })
  quietHoursStart: string;

  @Column({ type: 'time', nullable: true })
  quietHoursEnd: string;

  @Column({ type: 'varchar', length: 10, default: 'UTC' })
  timezone: string;

  @Column({ type: 'jsonb', nullable: true })
  customPreferences: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
