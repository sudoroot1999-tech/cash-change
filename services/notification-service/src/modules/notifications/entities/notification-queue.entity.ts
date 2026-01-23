import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, NotificationChannel, NotificationType, NOTIFICAION_STATUS, NotificationStatus } from '@exchange/common';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';


@Entity('notification_queue')
export class NotificationQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['user_id'])
  @Column({ name: 'user_id' })
  userId: string;

  @Index(['type'])
  @Column({ type: 'enum', enum: NOTIFICATION_TYPES })
  type: NotificationType;

  @Column({ type: 'enum', enum: NOTIFICATION_CHANNELS })
  channel: NotificationChannel;

  @Column({ nullable: true, name: 'template_id' })
  templateId: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Index()
  @Column({ type: 'enum', enum: NOTIFICAION_STATUS, default: NOTIFICAION_STATUS.PENDING })
  status: NotificationStatus;

  @Column({ type: 'int', default: 0, name: 'retry_count' })
  retryCount: number;

  @Column({ type: 'int', default: 3, name: 'max_retries' })
  maxRetries: number;

  @Column({ type: 'int', default: 5 })
  priority: number;

  @Index()
  @Column({ type: 'timestamp', nullable: true, name: 'scheduled_at' })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at' })
  sentAt: Date;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
