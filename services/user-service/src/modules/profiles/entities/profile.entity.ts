import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName!: string | null;

  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName!: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: Date | null;

  @Column({ length: 100, nullable: true })
  country!: string | null;

  @Column({ length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'postal_code', length: 20, nullable: true })
  postalCode!: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'jsonb', default: {} })
  preferences!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
