import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditLogAction {
  // User actions
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  USER_UPDATE_PROFILE = 'user_update_profile',
  USER_CHANGE_PASSWORD = 'user_change_password',
  USER_ENABLE_2FA = 'user_enable_2fa',
  USER_DISABLE_2FA = 'user_disable_2fa',

  // KYC actions
  KYC_SUBMIT = 'kyc_submit',
  KYC_APPROVE = 'kyc_approve',
  KYC_REJECT = 'kyc_reject',

  // Wallet actions
  WALLET_CREATE = 'wallet_create',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',

  // Trading actions
  ORDER_CREATE = 'order_create',
  ORDER_CANCEL = 'order_cancel',
  TRADE_EXECUTE = 'trade_execute',

  // GDPR actions
  DATA_EXPORT_REQUEST = 'data_export_request',
  DATA_DELETE_REQUEST = 'data_delete_request',
  DATA_ACCESS = 'data_access',

  // Admin actions
  ADMIN_USER_SUSPEND = 'admin_user_suspend',
  ADMIN_USER_UNSUSPEND = 'admin_user_unsuspend',
  ADMIN_TRANSACTION_REVIEW = 'admin_transaction_review',
  ADMIN_COMPLIANCE_OVERRIDE = 'admin_compliance_override',
  ADMIN_SETTINGS_CHANGE = 'admin_settings_change',

  // System actions
  SYSTEM_BACKUP = 'system_backup',
  SYSTEM_MAINTENANCE = 'system_maintenance',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index(['user_id'])
  userId!: string | null;

  @Index(['action'])
  @Column({
    type: 'enum',
    enum: AuditLogAction,
  })
  action!: AuditLogAction;

  @Column({ type: 'varchar', length: 100 })
  resource!: string;

  @Column({ name: 'resource_id', type: 'varchar', length: 255, nullable: true })
  resourceId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, any> | null;

  @Index(['ip_address'])
  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 255, nullable: true })
  sessionId!: string | null;

  @Column({ type: 'boolean', default: false })
  success!: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'blockchain_hash', type: 'varchar', length: 255, nullable: true })
  blockchainHash!: string | null;

  @Index(['created_at'])
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
