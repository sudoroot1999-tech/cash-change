import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { NotificationChannel, NotificationType } from '../../notifications/entities';


@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationChannel, array: true })
  channels: NotificationChannel[];

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'text' })
  template: string;

  @Column({ type: 'text', nullable: true })
  smsTemplate: string;

  @Column({ type: 'text', nullable: true })
  pushTemplate: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  requiresAuth: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ nullable: true })
  abTestGroup: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
