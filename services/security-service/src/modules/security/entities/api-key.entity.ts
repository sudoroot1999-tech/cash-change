import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ApiKeyPermission {
  READ = 'READ',
  TRADE = 'TRADE',
  WITHDRAW = 'WITHDRAW',
}

@Entity('api_keys')
@Index(['userId', 'isActive'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'key_name' })
  keyName: string;

  @Column({ name: 'api_key', unique: true })
  @Index()
  apiKey: string;

  @Column({ name: 'secret_hash' })
  secretHash: string;

  @Column({ type: 'simple-array' })
  permissions: ApiKeyPermission[];

  @Column({ name: 'ip_whitelist', type: 'simple-array', nullable: true })
  ipWhitelist: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @Column({ name: 'last_rotated_at', type: 'timestamp', nullable: true })
  lastRotatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
