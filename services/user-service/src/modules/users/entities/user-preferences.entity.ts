import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true, name: 'user_id' })
  userId: string;

  // Localization preferences
  @Column({ default: 'en' })
  language: string;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ default: 'UTC' })
  timezone: string;

  // Notification preferences
  @Column({ default: true, name: 'notification_email' })
  notificationEmail: boolean;

  @Column({ default: false, name: 'notification_sms' })
  notificationSms: boolean;

  @Column({ default: true, name: 'notification_push' })
  notificationPush: boolean;

  @Column({ default: true, name: 'notification_trading_alerts' })
  notificationTradingAlerts: boolean;

  @Column({ default: true, name: 'notification_price_alerts' })
  notificationPriceAlerts: boolean;

  @Column({ default: false, name: 'notification_newsletters' })
  notificationNewsletters: boolean;

  // Trading preferences
  @Column({ default: true, name: 'trading_confirmations' })
  tradingConfirmations: boolean;

  @Column({ default: false, name: 'trading_auto_compound' })
  tradingAutoCompound: boolean;

  @Column({ default: 'LIMIT', name: 'trading_default_order_type' })
  tradingDefaultOrderType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
