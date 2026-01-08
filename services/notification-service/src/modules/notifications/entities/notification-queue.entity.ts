import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, NotificationChannel, NotificationType, NOTIFICAION_STATUS, NotificationStatus } from '@exchange/common';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';


@Entity('notification_queue')
@Index(['status', 'scheduledAt'])
@Index(['userId'])
export class NotificationQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: NOTIFICATION_TYPES })
  type: NotificationType;

  @Column({ type: 'enum', enum: NOTIFICATION_CHANNELS })
  channel: NotificationChannel;

  @Column({ nullable: true })
  templateId: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'enum', enum: NOTIFICAION_STATUS, default: NOTIFICAION_STATUS.PENDING })
  status: NotificationStatus;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'int', default: 5 })
  priority: number;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
