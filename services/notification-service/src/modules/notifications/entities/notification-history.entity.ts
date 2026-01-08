import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { DELIVERY_STATUS, DeliveryStatus, NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, NotificationChannel, NotificationType } from '@exchange/common';

@Entity('notification_history')
@Index(['userId', 'createdAt'])
@Index(['type', 'channel'])
@Index(['status'])
export class NotificationHistory {
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
  queueId: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: DELIVERY_STATUS })
  status: DeliveryStatus;

  @Column({ nullable: true })
  recipient: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  externalId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  openedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt: Date;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
