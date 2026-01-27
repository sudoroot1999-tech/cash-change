import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export enum CampaignType {
  WELCOME = 'welcome',
  ONBOARDING = 'onboarding',
  PROMOTIONAL = 'promotional',
  TRANSACTIONAL = 'transactional',
  NEWSLETTER = 'newsletter',
  RE_ENGAGEMENT = 're_engagement',
  PRICE_ALERT = 'price_alert',
  TRADING_SIGNAL = 'trading_signal',
  ABANDONED_CART = 'abandoned_cart',
  BIRTHDAY = 'birthday',
  ANNIVERSARY = 'anniversary',
  WIN_BACK = 'win_back',
}

export enum TriggerType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  EVENT_BASED = 'event_based',
  BEHAVIORAL = 'behavioral',
}

@Entity('email_campaigns')
@Index(['status'])
@Index(['type'])
@Index(['scheduledAt'])
export class EmailCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({
    type: 'enum',
    enum: CampaignType,
  })
  type: CampaignType;

  @Column({
    type: 'enum',
    enum: TriggerType,
    default: TriggerType.MANUAL,
  })
  triggerType: TriggerType;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  preheader: string;

  @Column({ type: 'varchar', length: 255 })
  fromName: string;

  @Column({ type: 'varchar', length: 255 })
  fromEmail: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  replyTo: string;

  @Column({ type: 'text' })
  htmlContent: string;

  @Column({ type: 'text', nullable: true })
  textContent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  templateId: string;

  @Column({ type: 'jsonb', nullable: true })
  templateVariables: Record<string, any>;

  // Segmentation
  @Column({ type: 'uuid', nullable: true })
  segmentId: string;

  @Column({ type: 'jsonb', nullable: true })
  targetCriteria: {
    userTypes?: string[];
    countries?: string[];
    excludeCountries?: string[];
    minTradeVolume?: number;
    maxTradeVolume?: number;
    registrationDateFrom?: Date;
    registrationDateTo?: Date;
    lastLoginFrom?: Date;
    lastLoginTo?: Date;
    loyaltyTiers?: string[];
    tags?: string[];
    customFilters?: Record<string, any>;
  };

  // A/B Testing
  @Column({ type: 'boolean', default: false })
  isAbTest: boolean;

  @Column({ type: 'jsonb', nullable: true })
  abTestConfig: {
    variants: Array<{
      id: string;
      name: string;
      subject?: string;
      htmlContent?: string;
      percentage: number;
    }>;
    winnerMetric: 'open_rate' | 'click_rate' | 'conversion_rate';
    testDuration: number; // hours
  };

  // Scheduling
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone: string;

  // Automation rules
  @Column({ type: 'jsonb', nullable: true })
  automationRules: {
    triggerEvent?: string;
    delayMinutes?: number;
    conditions?: Record<string, any>;
    frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
    maxSends?: number;
  };

  // Performance metrics
  @Column({ type: 'integer', default: 0 })
  totalRecipients: number;

  @Column({ type: 'integer', default: 0 })
  sent: number;

  @Column({ type: 'integer', default: 0 })
  delivered: number;

  @Column({ type: 'integer', default: 0 })
  opened: number;

  @Column({ type: 'integer', default: 0 })
  clicked: number;

  @Column({ type: 'integer', default: 0 })
  bounced: number;

  @Column({ type: 'integer', default: 0 })
  unsubscribed: number;

  @Column({ type: 'integer', default: 0 })
  complained: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  openRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  clickRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate: number;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
