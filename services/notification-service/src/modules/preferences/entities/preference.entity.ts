import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'email_enabled', default: true })
  emailEnabled!: boolean;

  @Column({ name: 'sms_enabled', default: false })
  smsEnabled!: boolean;

  @Column({ name: 'push_enabled', default: true })
  pushEnabled!: boolean;

  @Column({ name: 'in_app_enabled', default: true })
  inAppEnabled!: boolean;

  @Column({ name: 'telegram_enabled', default: false })
  telegramEnabled!: boolean;

  @Column({ name: 'telegram_chat_id', length: 100, nullable: true })
  telegramChatId!: string | null;

  @Column({ name: 'discord_enabled', default: false })
  discordEnabled!: boolean;

  @Column({ name: 'discord_webhook', type: 'text', nullable: true })
  discordWebhook!: string | null;

  @Column({ name: 'price_alerts', default: true })
  priceAlerts!: boolean;

  @Column({ name: 'trade_alerts', default: true })
  tradeAlerts!: boolean;

  @Column({ name: 'deposit_alerts', default: true })
  depositAlerts!: boolean;

  @Column({ name: 'withdrawal_alerts', default: true })
  withdrawalAlerts!: boolean;

  @Column({ name: 'security_alerts', default: true })
  securityAlerts!: boolean;

  @Column({ name: 'marketing_alerts', default: false })
  marketingAlerts!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
