import { INCIDENT_SEVERITY, INCIDENT_STATUS, INCIDENT_TYPES, IncidentSeverity, IncidentStatus, IncidentType } from '@exchange/common';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';


@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: INCIDENT_TYPES,
  })
  type: IncidentType;

  @Index(['severity'])
  @Column({
    type: 'enum',
    enum: INCIDENT_SEVERITY,
  })
  severity: IncidentSeverity;

  @Index(['status'])
  @Column({
    type: 'enum',
    enum: INCIDENT_STATUS,
    default: INCIDENT_STATUS.DETECTED,
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

  @Index(['created_at'])
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
