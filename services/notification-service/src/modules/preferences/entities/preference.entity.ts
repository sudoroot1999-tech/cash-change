import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'email_enabled', type: 'boolean', default: true })
  emailEnabled!: boolean;

  @Column({ name: 'sms_enabled', type: 'boolean', default: false })
  smsEnabled!: boolean;

  @Column({ name: 'push_enabled', type: 'boolean', default: true })
  pushEnabled!: boolean;

  @Column({ name: 'in_app_enabled', type: 'boolean', default: true })
  inAppEnabled!: boolean;

  @Column({ name: 'telegram_enabled', type: 'boolean', default: false })
  telegramEnabled!: boolean;

  @Column({ name: 'telegram_chat_id', type: 'varchar', length: 100, nullable: true })
  telegramChatId!: string | null;

  @Column({ name: 'discord_enabled', type: 'boolean', default: false })
  discordEnabled!: boolean;

  @Column({ name: 'discord_webhook', type: 'text', nullable: true })
  discordWebhook!: string | null;

  @Column({ name: 'price_alerts', type: 'boolean', default: true })
  priceAlerts!: boolean;

  @Column({ name: 'trade_alerts', type: 'boolean', default: true })
  tradeAlerts!: boolean;

  @Column({ name: 'deposit_alerts', type: 'boolean', default: true })
  depositAlerts!: boolean;

  @Column({ name: 'withdrawal_alerts', type: 'boolean', default: true })
  withdrawalAlerts!: boolean;

  @Column({ name: 'security_alerts', type: 'boolean', default: true })
  securityAlerts!: boolean;

  @Column({ name: 'marketing_alerts', type: 'boolean', default: false })
  marketingAlerts!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
