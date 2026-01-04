import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_preferences')
@Index(['userId'], { unique: true })
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  // Localization preferences
  @Column({ default: 'en' })
  language: string;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ default: 'UTC' })
  timezone: string;

  // Notification preferences
  @Column({ default: true })
  notificationEmail: boolean;

  @Column({ default: false })
  notificationSms: boolean;

  @Column({ default: true })
  notificationPush: boolean;

  @Column({ default: true })
  notificationTradingAlerts: boolean;

  @Column({ default: true })
  notificationPriceAlerts: boolean;

  @Column({ default: false })
  notificationNewsletters: boolean;

  // Trading preferences
  @Column({ default: true })
  tradingConfirmations: boolean;

  @Column({ default: false })
  tradingAutoCompound: boolean;

  @Column({ default: 'LIMIT' })
  tradingDefaultOrderType: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
