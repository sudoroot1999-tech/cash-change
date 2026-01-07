import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index(['user_id'], { unique: true })
@Index(['enabled'])
@Entity('user_two_factors')
export class UserTwoFactor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column()
  secret: string; // base32 (encrypted در prod)

  @Column({ type: 'jsonb', default: [] })
  backupCodes: string[]; // hashed, single-use

  @Column({ default: false })
  isEnabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastVerifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
