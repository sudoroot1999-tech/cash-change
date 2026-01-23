import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RestrictionType {
  BLOCKED = 'blocked',
  HIGH_RISK = 'high_risk',
  RESTRICTED_FEATURES = 'restricted_features',
  KYC_REQUIRED = 'kyc_required',
}

@Entity('geo_restrictions')
export class GeoRestriction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index(['user_id'])
  userId!: string | null;

  @Index(['ip_address'])
  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress!: string;

  @Index(['country_code'])
  @Column({ name: 'country_code', type: 'varchar', length: 2})
  countryCode!: string;

  @Column({ name: 'country_name', type: 'varchar', length: 100, nullable: true })
  countryName!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region!: string | null;

  @Column({
    type: 'enum',
    enum: RestrictionType,
  })
  type!: RestrictionType;

  @Column({ name: 'is_vpn', type: 'boolean', default: false })
  isVpn!: boolean;

  @Column({ name: 'is_proxy', type: 'boolean', default: false })
  isProxy!: boolean;

  @Column({ name: 'is_tor', type: 'boolean', default: false })
  isTor!: boolean;

  @Column({ name: 'access_allowed', type: 'boolean', default: true })
  accessAllowed!: boolean;

  @Column({ name: 'blocked_features', type: 'text', array: true, nullable: true })
  blockedFeatures!: string[] | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
