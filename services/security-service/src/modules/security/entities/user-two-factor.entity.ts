import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_two_factors')
export class UserTwoFactor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index(['user_id'], { unique: true })
  @Column({ type: 'uuid', unique: true, name: 'user_id' })
  userId: string;

  @Column()
  secret: string; // base32 (encrypted در prod)

  @Column({ type: 'jsonb', default: [], name:'backup_codes'})
  backupCodes: string[]; // hashed, single-use

  @Index(['is_enabled'])
  @Column({ default: false, name:'is_enabled'})
  isEnabled: boolean;

  @Column({ type: 'timestamp', nullable: true, name:'last_verified_at'})
  lastVerifiedAt: Date;

  @CreateDateColumn({ name:'created_at'})
  createdAt: Date;

  @UpdateDateColumn({ name:'updated_at'})
  updatedAt: Date;
}
