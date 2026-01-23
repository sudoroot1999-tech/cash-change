import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserStatus, USER_STATUS, UserTier, USER_TIERS } from "@exchange/common"

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', unique: true, length: 255 })
  email!: string;

  @Index()
  @Column({ type: 'varchar', unique: true, length: 50 })
  username!: string;

  @Column({ type: 'varchar', unique: true, length: 50, nullable: true })
  phone!: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  @Exclude()
  passwordHash!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: USER_STATUS,
    default: USER_STATUS.PENDING,
  })
  status!: UserStatus;

  @Column({
    type: 'enum',
    enum: USER_TIERS,
    default: USER_TIERS.BASIC,
  })
  tier!: UserTier;

  @Column({ name: 'kyc_level', type: 'int', default: 0 })
  kycLevel!: number;

  @Index()
  @Column({ name: 'referral_code', type: 'varchar', unique: true, length: 20 })
  referralCode!: string;

  @Column({ name: 'referred_by', type: 'uuid', nullable: true })
  referredBy!: string | null;

  @Column({ name: 'two_factor_enabled', type: 'boolean', default: true })
  twoFactorEnabled!: boolean;

  @Column({ name: 'two_factor_secret', type: 'varchar', length: 255, nullable: true })
  @Exclude()
  twoFactorSecret!: string | null;

  @Index()
  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ name: 'phone_verified', type: 'boolean', default: false })
  phoneVerified!: boolean;

  @Column({ nullable: true, name: 'email_verification_token' })
  emailVerificationToken: string;

  @Column({ nullable: true, name: 'anti_phishing_code' })
  antiPhishingCode: string;

  @Column({ nullable: true, name: 'last_login_at' })
  lastLoginAt: Date;

  @Column({ nullable: true, name: 'last_login_ip' })
  lastLoginIp: string;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
