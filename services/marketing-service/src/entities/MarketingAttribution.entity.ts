import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AttributionModel {
  FIRST_TOUCH = 'first_touch',
  LAST_TOUCH = 'last_touch',
  LINEAR = 'linear',
  TIME_DECAY = 'time_decay',
  U_SHAPED = 'u_shaped',
  W_SHAPED = 'w_shaped',
}

export enum ConversionType {
  REGISTRATION = 'registration',
  KYC_COMPLETION = 'kyc_completion',
  FIRST_DEPOSIT = 'first_deposit',
  FIRST_TRADE = 'first_trade',
  SUBSCRIPTION = 'subscription',
}

@Entity('marketing_attributions')
@Index(['userId'])
@Index(['conversionType'])
@Index(['channel', 'createdAt'])
export class MarketingAttribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ConversionType,
  })
  conversionType: ConversionType;

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  conversionValue: number;

  @Column({ type: 'varchar', length: 100 })
  channel: string; // organic, paid, social, referral, email, direct

  @Column({ type: 'varchar', length: 255, nullable: true })
  campaign: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  medium: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  term: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  content: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  landingPage: string;

  // Touch points (all interactions before conversion)
  @Column({ type: 'jsonb', default: [] })
  touchpoints: Array<{
    timestamp: Date;
    channel: string;
    source?: string;
    medium?: string;
    campaign?: string;
    referrer?: string;
    landingPage?: string;
  }>;

  @Column({
    type: 'enum',
    enum: AttributionModel,
    default: AttributionModel.LAST_TOUCH,
  })
  attributionModel: AttributionModel;

  // Attribution weights for multi-touch
  @Column({ type: 'jsonb', nullable: true })
  attributionWeights: Record<string, number>;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  device: {
    type?: string;
    brand?: string;
    model?: string;
    os?: string;
    browser?: string;
  };

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'timestamp' })
  conversionDate: Date;

  @Column({ type: 'integer', nullable: true })
  timeToConversion: number; // seconds from first touch

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
