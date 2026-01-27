import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum FraudType {
  SUSPICIOUS_XP_GAIN = 'suspicious_xp_gain',
  MISSION_ABUSE = 'mission_abuse',
  GAME_MANIPULATION = 'game_manipulation',
  ACCOUNT_SHARING = 'account_sharing',
  BOT_ACTIVITY = 'bot_activity',
  REWARD_FARMING = 'reward_farming',
}

export enum FraudSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('fraud_detections')
@Index(['userId', 'createdAt'])
export class FraudDetection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: FraudType,
  })
  type: FraudType;

  @Column({
    type: 'enum',
    enum: FraudSeverity,
  })
  severity: FraudSeverity;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb' })
  evidence: Record<string, any>;

  @Column({ name: 'risk_score', type: 'decimal', precision: 5, scale: 2 })
  riskScore: number;

  @Column({ name: 'is_resolved', type: 'boolean', default: false })
  isResolved: boolean;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
