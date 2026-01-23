import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { DELIVERY_STATUS, DeliveryStatus, NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, NotificationChannel, NotificationType } from '@exchange/common';

@Entity('notification_history')
export class NotificationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['user_id'])
  @Column({ name: 'user_id' })
  userId: string;

  @Index(['type'])
  @Column({ type: 'enum', enum: NOTIFICATION_TYPES })
  type: NotificationType;

  @Index(['channel'])
  @Column({ type: 'enum', enum: NOTIFICATION_CHANNELS })
  channel: NotificationChannel;

  @Column({ nullable: true, name: 'template_id' })
  templateId: string;

  @Column({ nullable: true, name: 'queue_id' })
  queueId: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text' })
  content: string;

  @Index(['status'])
  @Column({ type: 'enum', enum: DELIVERY_STATUS })
  status: DeliveryStatus;

  @Column({ nullable: true })
  recipient: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  @Column({ nullable: true, name: 'external_id' })
  externalId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at' })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'delivered_at' })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'opened_at' })
  openedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name:'clicked_at' })
  clickedAt: Date;

  @Column({ default: false, name:'is_read' })
  isRead: boolean;

  @Index(['created_at'])
  @CreateDateColumn({ name:'created_at'})
  createdAt: Date;
}
