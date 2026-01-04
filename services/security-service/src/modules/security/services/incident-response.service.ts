import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Incident,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
} from '../entities/incident.entity';
import { SecurityEvent, SecurityEventType, RiskLevel } from '../entities/security-event.entity';

export interface CreateIncidentDto {
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  affectedUsers?: string[];
  affectedSystems?: string[];
  detectedBy?: string;
  evidence?: Record<string, any>;
}

@Injectable()
export class IncidentResponseService {
  private readonly logger = new Logger(IncidentResponseService.name);
  private circuitBreakerActive = false;

  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
    @InjectRepository(SecurityEvent)
    private securityEventRepository: Repository<SecurityEvent>,
  ) {}

  async createIncident(data: CreateIncidentDto): Promise<Incident> {
    const incident = this.incidentRepository.create({
      ...data,
      status: IncidentStatus.DETECTED,
      detectedAt: new Date(),
      actions: [],
    });

    await this.incidentRepository.save(incident);
    this.logger.error(`SECURITY INCIDENT: ${incident.title} [${incident.severity}]`);

    if (incident.severity === IncidentSeverity.CRITICAL) {
      await this.triggerCircuitBreaker(incident.id);
    }

    return incident;
  }

  async updateStatus(
    incidentId: string,
    status: IncidentStatus,
    performedBy: string,
  ): Promise<Incident> {
    const incident = await this.incidentRepository.findOne({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new Error('Incident not found');
    }

    incident.status = status;
    incident.actions = [...(incident.actions || []), {
      timestamp: new Date().toISOString(),
      action: `Status changed to ${status}`,
      performedBy,
    }];

    if (status === IncidentStatus.CONTAINED) {
      incident.containedAt = new Date();
    } else if (status === IncidentStatus.RESOLVED) {
      incident.resolvedAt = new Date();
    }

    return await this.incidentRepository.save(incident);
  }

  async triggerCircuitBreaker(incidentId: string): Promise<void> {
    this.circuitBreakerActive = true;
    this.logger.error(`CIRCUIT BREAKER ACTIVATED for incident ${incidentId}`);
    
    // In production, this would:
    // 1. Pause withdrawals
    // 2. Pause trading
    // 3. Send alerts to admin team
  }

  async pauseWithdrawals(): Promise<void> {
    this.logger.warn('Emergency: All withdrawals paused');
  }

  async resumeWithdrawals(): Promise<void> {
    this.logger.log('Withdrawals resumed');
  }

  async getActiveIncidents(): Promise<Incident[]> {
    return await this.incidentRepository.find({
      where: [
        { status: IncidentStatus.DETECTED },
        { status: IncidentStatus.INVESTIGATING },
        { status: IncidentStatus.CONTAINED },
      ],
      order: { detectedAt: 'DESC' },
    });
  }

  async getIncidentById(incidentId: string): Promise<Incident | null> {
    return await this.incidentRepository.findOne({
      where: { id: incidentId },
    });
  }

  private async logSecurityEvent(
    eventType: SecurityEventType,
    details: Record<string, any>,
  ): Promise<void> {
    const event = this.securityEventRepository.create({
      userId: 'system',
      eventType,
      riskLevel: RiskLevel.CRITICAL,
      details,
    });

    await this.securityEventRepository.save(event);
  }
}
