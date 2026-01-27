import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AffiliateProgramStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
}

@Entity('affiliate_programs')
@Index(['status'])
export class AffiliateProgram {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AffiliateProgramStatus,
    default: AffiliateProgramStatus.ACTIVE,
  })
  status: AffiliateProgramStatus;

  // Commission structure
  @Column({ type: 'jsonb' })
  commissionTiers: Array<{
    name: string;
    minMonthlyVolume: number;
    commissionRate: number;
    cpaBonus?: number; // Cost per acquisition
    recurringRate?: number; // For lifetime commissions
  }>;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  defaultCommissionRate: number;

  @Column({ type: 'boolean', default: false })
  hasLifetimeCommissions: boolean;

  @Column({ type: 'integer', nullable: true })
  cookieDuration: number; // days

  // Payout configuration
  @Column({ type: 'decimal', precision: 20, scale: 2 })
  minimumPayout: number;

  @Column({ type: 'varchar', length: 20 })
  payoutCurrency: string;

  @Column({ type: 'varchar', length: 50 })
  payoutFrequency: string; // weekly, biweekly, monthly

  @Column({ type: 'jsonb', default: [] })
  payoutMethods: string[]; // crypto, bank, paypal

  // Requirements
  @Column({ type: 'jsonb' })
  requirements: {
    minTrafficPerMonth?: number;
    requiresApproval?: boolean;
    kycRequired?: boolean;
    minAge?: number;
    allowedCountries?: string[];
    excludedCountries?: string[];
  };

  // Marketing materials
  @Column({ type: 'jsonb', default: [] })
  marketingMaterials: Array<{
    type: string; // banner, video, copy
    name: string;
    url: string;
    dimensions?: string;
    format?: string;
  }>;

  // Performance tracking
  @Column({ type: 'integer', default: 0 })
  totalAffiliates: number;

  @Column({ type: 'integer', default: 0 })
  activeAffiliates: number;

  @Column({ type: 'decimal', precision: 30, scale: 2, default: 0 })
  totalCommissionsPaid: number;

  @Column({ type: 'decimal', precision: 30, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'integer', default: 0 })
  totalConversions: number;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
