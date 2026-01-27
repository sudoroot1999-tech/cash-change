import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PushCampaign } from './PushCampaign.entity';

export enum PushStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  CLICKED = 'clicked',
  DISMISSED = 'dismissed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

@Entity('push_notification_logs')
@Index(['campaignId', 'userId'])
@Index(['userId', 'status'])
@Index(['status', 'createdAt'])
export class PushNotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  campaignId: string;

  @ManyToOne(() => PushCampaign)
  @JoinColumn({ name: 'campaignId' })
  campaign: PushCampaign;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 500 })
  deviceToken: string;

  @Column({ type: 'varchar', length: 20 })
  platform: string; // ios, android, web

  @Column({
    type: 'enum',
    enum: PushStatus,
    default: PushStatus.QUEUED,
  })
  status: PushStatus;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerMessageId: string;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  dismissedAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  clickedAction: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  errorCode: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
