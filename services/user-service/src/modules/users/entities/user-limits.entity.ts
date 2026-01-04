import { KYC_LEVELS,KycLevel } from '@exchange/common';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';



@Entity('user_limits')
@Index(['userId'], { unique: true })
export class UserLimits {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: KYC_LEVELS,
    default: KYC_LEVELS.NONE,
  })
  kycLevel: KycLevel;

  // Withdrawal limits
  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  dailyWithdrawalLimit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  monthlyWithdrawalLimit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  currentDailyWithdrawal: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  currentMonthlyWithdrawal: number;

  // Deposit limits
  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  dailyDepositLimit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  monthlyDepositLimit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  currentDailyDeposit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  currentMonthlyDeposit: number;

  // Trading limits
  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  dailyTradeLimit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  monthlyTradeLimit: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  currentDailyTrade: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  currentMonthlyTrade: number;

  // Reset tracking
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastResetDaily: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastResetMonthly: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
