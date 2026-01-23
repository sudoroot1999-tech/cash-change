import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('withdrawal_limits')
@Index(['user_id', 'currency'], { unique: true })
export class WithdrawalLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({ name: 'daily_limit', type: 'decimal', precision: 36, scale: 18 })
  dailyLimit: string;

  @Column({ name: 'daily_used', type: 'decimal', precision: 36, scale: 18, default: '0' })
  dailyUsed: string;

  @Column({ name: 'monthly_limit', type: 'decimal', precision: 36, scale: 18 })
  monthlyLimit: string;

  @Column({ name: 'monthly_used', type: 'decimal', precision: 36, scale: 18, default: '0' })
  monthlyUsed: string;

  @Column({ name: 'kyc_level', type: 'int', default: 1 })
  kycLevel: number;

  @Column({ name: 'last_reset_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastResetAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
