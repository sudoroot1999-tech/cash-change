import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_segments')
@Index(['name'], { unique: true })
export class UserSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  criteria: {
    userTypes?: string[]; // new, active, inactive, churned
    countries?: string[];
    excludeCountries?: string[];
    registrationDateFrom?: Date;
    registrationDateTo?: Date;
    lastLoginFrom?: Date;
    lastLoginTo?: Date;
    minTradeVolume?: number;
    maxTradeVolume?: number;
    minTrades?: number;
    maxTrades?: number;
    minDeposit?: number;
    maxDeposit?: number;
    loyaltyTiers?: string[];
    hasReferrals?: boolean;
    minReferrals?: number;
    kycStatus?: string[];
    tags?: string[];
    emailVerified?: boolean;
    phoneVerified?: boolean;
    twoFactorEnabled?: boolean;
    subscribedToNewsletter?: boolean;
    customAttributes?: Record<string, any>;
    sqlQuery?: string; // Advanced: raw SQL for complex queries
  };

  @Column({ type: 'integer', default: 0 })
  estimatedSize: number;

  @Column({ type: 'timestamp', nullable: true })
  lastCalculatedAt: Date;

  @Column({ type: 'boolean', default: true })
  isDynamic: boolean; // Recalculate on each use

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
