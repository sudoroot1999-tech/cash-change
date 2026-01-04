import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WhitelistStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

@Entity('withdrawal_whitelist')
@Index(['userId', 'address', 'currency'])
export class WithdrawalWhitelist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column()
  address: string;

  @Column()
  currency: string;

  @Column({ nullable: true })
  label: string;

  @Column({
    type: 'enum',
    enum: WhitelistStatus,
    default: WhitelistStatus.PENDING,
  })
  status: WhitelistStatus;

  @Column({ name: 'activated_at', type: 'timestamp', nullable: true })
  activatedAt: Date;

  @Column({ name: 'cooling_period_hours', default: 24 })
  coolingPeriodHours: number;

  @Column({ name: 'created_by_ip', nullable: true })
  createdByIp: string;

  @Column({ name: 'confirmed_via_email', default: false })
  confirmedViaEmail: boolean;

  @Column({ name: 'confirmed_via_sms', default: false })
  confirmedViaSms: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
