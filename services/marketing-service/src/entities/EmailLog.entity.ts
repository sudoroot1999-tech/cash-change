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
import { EmailCampaign } from './EmailCampaign.entity';

export enum EmailStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  FAILED = 'failed',
  UNSUBSCRIBED = 'unsubscribed',
  COMPLAINED = 'complained',
}

@Entity('email_logs')
@Index(['campaignId', 'userId'])
@Index(['userId', 'status'])
@Index(['status', 'createdAt'])
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  campaignId: string;

  @ManyToOne(() => EmailCampaign)
  @JoinColumn({ name: 'campaignId' })
  campaign: EmailCampaign;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  recipientEmail: string;

  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.QUEUED,
  })
  status: EmailStatus;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerMessageId: string; // SendGrid/Mailchimp message ID

  @Column({ type: 'varchar', length: 50, nullable: true })
  abTestVariant: string;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  openedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  firstClickedAt: Date;

  @Column({ type: 'integer', default: 0 })
  openCount: number;

  @Column({ type: 'integer', default: 0 })
  clickCount: number;

  @Column({ type: 'jsonb', default: [] })
  clickedLinks: string[];

  @Column({ type: 'text', nullable: true })
  bounceReason: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bounceType: string; // hard, soft

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  emailClient: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
