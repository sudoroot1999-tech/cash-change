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
import { Mission } from './mission.entity';

export enum MissionStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CLAIMED = 'claimed',
  EXPIRED = 'expired',
}

@Entity('user_missions')
@Index(['userId', 'missionId', 'status'])
export class UserMission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'mission_id', type: 'uuid' })
  missionId: string;

  @ManyToOne(() => Mission)
  @JoinColumn({ name: 'mission_id' })
  mission: Mission;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({
    type: 'enum',
    enum: MissionStatus,
    default: MissionStatus.NOT_STARTED,
  })
  status: MissionStatus;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'claimed_at', type: 'timestamp', nullable: true })
  claimedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
