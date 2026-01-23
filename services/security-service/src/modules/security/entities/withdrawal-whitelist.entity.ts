import { WHITE_LIST_STATUS, WhiteListStatus } from '@exchange/common';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('withdrawal_whitelist')
export class WithdrawalWhitelist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index(['user_id'])
  userId: string;

  @Index(['user_id'])
  @Column()
  address: string;

  @Index()
  @Column()
  currency: string;

  @Column({ nullable: true })
  label: string;

  @Column({
    type: 'enum',
    enum: WHITE_LIST_STATUS,
    default: WHITE_LIST_STATUS.PENDING,
  })
  status: WhiteListStatus;

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
