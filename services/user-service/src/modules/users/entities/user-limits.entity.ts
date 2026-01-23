import { KYC_LEVELS, KycLevel } from '@exchange/common';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_limits')
export class UserLimits {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true, name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: KYC_LEVELS,
    default: KYC_LEVELS.NONE,
    name: 'kyc_level'
  })
  kycLevel: KycLevel;

  // Withdrawal limits
  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0, name: 'daily_withdrawal_limit' })
  dailyWithdrawalLimit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0, name: 'monthly_withdrawal_limit' })
  monthlyWithdrawalLimit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0, name: 'current_daily_withdrawal' })
  currentDailyWithdrawal: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0, name: 'current_monthly_withdrawal' })
  currentMonthlyWithdrawal: number;

  // Deposit limits
  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0, name: 'daily_deposit_limit' })
  dailyDepositLimit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0, name: 'monthly_deposit_limit' })
  monthlyDepositLimit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0, name: 'current_daily_deposit' })
  currentDailyDeposit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0, name: 'current_monthly_deposit' })
  currentMonthlyDeposit: number;

  // Trading limits
  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0, name: 'daily_trade_limit' })
  dailyTradeLimit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0, name: 'monthly_trade_limit' })
  monthlyTradeLimit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0, name: 'current_daily_trade' })
  currentDailyTrade: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0, name: 'current_monthly_trade' })
  currentMonthlyTrade: number;

  // Reset tracking
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'last_reset_daily' })
  lastResetDaily: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'last_reset_monthly' })
  lastResetMonthly: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
