import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Badge } from './badge.entity';

@Entity('user_badges')
@Index(['userId', 'badgeId'], { unique: true })
export class UserBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'badge_id', type: 'uuid' })
  badgeId: string;

  @ManyToOne(() => Badge)
  @JoinColumn({ name: 'badge_id' })
  badge: Badge;

  @Column({ name: 'earned_at', type: 'timestamp' })
  earnedAt: Date;

  @Column({ name: 'progress', type: 'decimal', precision: 5, scale: 2, default: 100 })
  progress: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
