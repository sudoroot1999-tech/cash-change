import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('risk_scores')
@Index(['userId'])
export class RiskScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  @Index()
  userId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  score: number;

  @Column({ name: 'risk_level', default: 'LOW' })
  riskLevel: string;

  @Column({ type: 'jsonb', nullable: true })
  factors: {
    velocityScore?: number;
    patternScore?: number;
    deviceScore?: number;
    locationScore?: number;
    behaviorScore?: number;
  };

  @Column({ name: 'last_calculated_at', type: 'timestamp' })
  lastCalculatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
