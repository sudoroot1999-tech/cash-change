import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PushCampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export enum PushType {
  MARKETING = 'marketing',
  TRANSACTIONAL = 'transactional',
  ALERT = 'alert',
  NEWS = 'news',
  PRICE_ALERT = 'price_alert',
  TRADE_SIGNAL = 'trade_signal',
  PROMOTIONAL = 'promotional',
  FEATURE_ANNOUNCEMENT = 'feature_announcement',
}

export enum PushPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('push_campaigns')
@Index(['status'])
@Index(['type'])
@Index(['scheduledAt'])
export class PushCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PushCampaignStatus,
    default: PushCampaignStatus.DRAFT,
  })
  status: PushCampaignStatus;

  @Column({
    type: 'enum',
    enum: PushType,
  })
  type: PushType;

  @Column({
    type: 'enum',
    enum: PushPriority,
    default: PushPriority.NORMAL,
  })
  priority: PushPriority;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  iconUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  clickAction: string; // Deep link or URL

  @Column({ type: 'jsonb', nullable: true })
  actionButtons: Array<{
    id: string;
    text: string;
    action: string;
    icon?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>; // Custom data payload

  // Targeting
  @Column({ type: 'uuid', nullable: true })
  segmentId: string;

  @Column({ type: 'jsonb', nullable: true })
  targetCriteria: {
    platforms?: ('ios' | 'android' | 'web')[];
    countries?: string[];
    excludeCountries?: string[];
    languages?: string[];
    userTypes?: string[];
    loyaltyTiers?: string[];
    tags?: string[];
    customFilters?: Record<string, any>;
  };

  // Behavioral triggers
  @Column({ type: 'jsonb', nullable: true })
  behavioralTriggers: {
    triggerEvent?: string;
    conditions?: Record<string, any>;
    delayMinutes?: number;
    maxSends?: number;
    frequency?: 'once' | 'daily' | 'weekly';
  };

  // Personalization
  @Column({ type: 'boolean', default: false })
  isPersonalized: boolean;

  @Column({ type: 'jsonb', nullable: true })
  personalizationRules: Record<string, any>;

  // Scheduling
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone: string;

  @Column({ type: 'boolean', default: false })
  sendAtOptimalTime: boolean; // Send at best time for each user

  // Time to live
  @Column({ type: 'integer', nullable: true })
  ttlSeconds: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  // Performance metrics
  @Column({ type: 'integer', default: 0 })
  totalRecipients: number;

  @Column({ type: 'integer', default: 0 })
  sent: number;

  @Column({ type: 'integer', default: 0 })
  delivered: number;

  @Column({ type: 'integer', default: 0 })
  clicked: number;

  @Column({ type: 'integer', default: 0 })
  dismissed: number;

  @Column({ type: 'integer', default: 0 })
  failed: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  deliveryRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  clickRate: number;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
