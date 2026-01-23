import { NOTIFICATION_CHANNELS, NOTIFICATION_PRIORITY, NotificationChannel, NotificationPriority, NotificationStatus, NOTIFICAION_STATUS } from '@exchange/common';
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';


@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index(['user_id'])
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId!: string | null;

  @Column({ type: 'enum', enum: NOTIFICATION_CHANNELS })
  channel!: NotificationChannel;

  @Column({ type: 'int', default: NOTIFICATION_PRIORITY.MEDIUM })
  priority!: NotificationPriority;

  @Column({ type: 'enum', enum: NOTIFICAION_STATUS, default: NOTIFICAION_STATUS.PENDING })
  status!: NotificationStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject!: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
