import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES, NotificationChannel, NotificationType } from '@exchange/common';


@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['name'])
  @Column({ unique: true })
  name: string;

  @Index(['type'])
  @Column({ type: 'enum', enum: NOTIFICATION_TYPES })
  type: NotificationType;

  @Column({ type: 'enum', enum: NOTIFICATION_CHANNELS, array: true })
  channels: NotificationChannel[];

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text' })
  template: string;

  @Column({ type: 'text', nullable: true, name: 'sms_template' })
  smsTemplate: string;

  @Column({ type: 'text', nullable: true, name: 'push_template' })
  pushTemplate: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'requires_auth' })
  requiresAuth: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ nullable: true, name: 'ab_test_group' })
  abTestGroup: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
