import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('login_streaks')
@Index(['userId'], { unique: true })
export class LoginStreak {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'current_streak', type: 'int', default: 0 })
  currentStreak: number;

  @Column({ name: 'longest_streak', type: 'int', default: 0 })
  longestStreak: number;

  @Column({ name: 'last_login_date', type: 'date', nullable: true })
  lastLoginDate: Date;

  @Column({ name: 'total_logins', type: 'int', default: 0 })
  totalLogins: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
