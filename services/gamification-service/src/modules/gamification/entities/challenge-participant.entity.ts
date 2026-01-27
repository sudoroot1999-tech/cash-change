import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Challenge } from './challenge.entity';

@Entity('challenge_participants')
@Index(['userId', 'challengeId'], { unique: true })
@Index(['challengeId', 'score'])
export class ChallengeParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'challenge_id', type: 'uuid' })
  challengeId: string;

  @ManyToOne(() => Challenge)
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'team_id', type: 'uuid', nullable: true })
  teamId: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  score: number;

  @Column({ type: 'int', nullable: true })
  rank: number;

  @Column({ type: 'jsonb', nullable: true })
  stats: Record<string, any>;

  @Column({ name: 'joined_at', type: 'timestamp' })
  joinedAt: Date;

  @Column({ name: 'is_disqualified', type: 'boolean', default: false })
  isDisqualified: boolean;

  @Column({ name: 'disqualification_reason', type: 'text', nullable: true })
  disqualificationReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
