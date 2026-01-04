import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum IncidentType {
  SECURITY_BREACH = 'SECURITY_BREACH',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  WITHDRAWAL_ANOMALY = 'WITHDRAWAL_ANOMALY',
  API_ABUSE = 'API_ABUSE',
  DDOS_ATTACK = 'DDOS_ATTACK',
  SYSTEM_FAILURE = 'SYSTEM_FAILURE',
  OTHER = 'OTHER',
}

export enum IncidentSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum IncidentStatus {
  DETECTED = 'DETECTED',
  INVESTIGATING = 'INVESTIGATING',
  CONTAINED = 'CONTAINED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

@Entity('incidents')
@Index(['status', 'severity', 'createdAt'])
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: IncidentType,
  })
  type: IncidentType;

  @Column({
    type: 'enum',
    enum: IncidentSeverity,
  })
  severity: IncidentSeverity;

  @Column({
    type: 'enum',
    enum: IncidentStatus,
    default: IncidentStatus.DETECTED,
  })
  status: IncidentStatus;

  @Column({ name: 'affected_users', type: 'simple-array', nullable: true })
  affectedUsers: string[];

  @Column({ name: 'affected_systems', type: 'simple-array', nullable: true })
  affectedSystems: string[];

  @Column({ name: 'detected_by', nullable: true })
  detectedBy: string;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string;

  @Column({ type: 'jsonb', nullable: true })
  evidence: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  actions: Array<{
    timestamp: string;
    action: string;
    performedBy: string;
  }>;

  @Column({ name: 'root_cause', type: 'text', nullable: true })
  rootCause: string;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string;

  @Column({ name: 'post_mortem_url', nullable: true })
  postMortemUrl: string;

  @Column({ name: 'detected_at', type: 'timestamp' })
  detectedAt: Date;

  @Column({ name: 'contained_at', type: 'timestamp', nullable: true })
  containedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
