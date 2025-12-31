import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import * as crypto from 'crypto';

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IncidentStatus {
  DETECTED = 'DETECTED',
  INVESTIGATING = 'INVESTIGATING',
  CONTAINED = 'CONTAINED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export interface SecurityIncident {
  id: string;
  type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  detectedAt: Date;
  detectedBy: string;
  affectedSystems: string[];
  affectedUsers: string[];
  indicators: string[];
  timeline: IncidentTimelineEntry[];
  assignedTo?: string;
  resolvedAt?: Date;
  postMortem?: string;
}

export interface IncidentTimelineEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details: string;
}

export interface EmergencyAction {
  name: string;
  description: string;
  severity: IncidentSeverity;
  execute: () => Promise<void>;
}

@Injectable()
export class IncidentManagerService {
  private readonly logger = new Logger(IncidentManagerService.name);
  private redis: Redis;
  private emergencyActions: Map<string, EmergencyAction> = new Map();

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
    this.registerEmergencyActions();
  }

  /**
   * Create security incident
   */
  async createIncident(
    type: string,
    severity: IncidentSeverity,
    description: string,
    detectedBy: string,
    metadata?: {
      affectedSystems?: string[];
      affectedUsers?: string[];
      indicators?: string[];
    },
  ): Promise<SecurityIncident> {
    const id = `INC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const incident: SecurityIncident = {
      id,
      type,
      severity,
      status: IncidentStatus.DETECTED,
      description,
      detectedAt: new Date(),
      detectedBy,
      affectedSystems: metadata?.affectedSystems || [],
      affectedUsers: metadata?.affectedUsers || [],
      indicators: metadata?.indicators || [],
      timeline: [
        {
          timestamp: new Date(),
          action: 'INCIDENT_CREATED',
          performedBy: detectedBy,
          details: description,
        },
      ],
    };

    await this.redis.set(`incident:${id}`, JSON.stringify(incident));
    await this.redis.sadd('active_incidents', id);
    await this.redis.sadd(`incidents:${severity}`, id);

    this.logger.error(`Security incident created: ${id} - ${type} (${severity})`);

    // Trigger alerts for high/critical incidents
    if (severity === IncidentSeverity.HIGH || severity === IncidentSeverity.CRITICAL) {
      await this.triggerAlert(incident);
    }

    return incident;
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    performedBy: string,
    details: string,
  ): Promise<void> {
    const data = await this.redis.get(`incident:${incidentId}`);
    if (!data) {
      throw new Error('Incident not found');
    }

    const incident: SecurityIncident = JSON.parse(data);
    incident.status = status;
    incident.timeline.push({
      timestamp: new Date(),
      action: `STATUS_CHANGED_TO_${status}`,
      performedBy,
      details,
    });

    if (status === IncidentStatus.RESOLVED) {
      incident.resolvedAt = new Date();
    }

    if (status === IncidentStatus.CLOSED) {
      await this.redis.srem('active_incidents', incidentId);
    }

    await this.redis.set(`incident:${incidentId}`, JSON.stringify(incident));

    this.logger.log(`Incident ${incidentId} status updated to ${status}`);
  }

  /**
   * Assign incident
   */
  async assignIncident(
    incidentId: string,
    assignedTo: string,
    assignedBy: string,
  ): Promise<void> {
    const data = await this.redis.get(`incident:${incidentId}`);
    if (!data) {
      throw new Error('Incident not found');
    }

    const incident: SecurityIncident = JSON.parse(data);
    incident.assignedTo = assignedTo;
    incident.timeline.push({
      timestamp: new Date(),
      action: 'INCIDENT_ASSIGNED',
      performedBy: assignedBy,
      details: `Assigned to ${assignedTo}`,
    });

    await this.redis.set(`incident:${incidentId}`, JSON.stringify(incident));

    this.logger.log(`Incident ${incidentId} assigned to ${assignedTo}`);
  }

  /**
   * Add timeline entry
   */
  async addTimelineEntry(
    incidentId: string,
    action: string,
    performedBy: string,
    details: string,
  ): Promise<void> {
    const data = await this.redis.get(`incident:${incidentId}`);
    if (!data) {
      throw new Error('Incident not found');
    }

    const incident: SecurityIncident = JSON.parse(data);
    incident.timeline.push({
      timestamp: new Date(),
      action,
      performedBy,
      details,
    });

    await this.redis.set(`incident:${incidentId}`, JSON.stringify(incident));
  }

  /**
   * Execute emergency shutdown
   */
  async emergencyShutdown(
    reason: string,
    performedBy: string,
    services?: string[],
  ): Promise<void> {
    const incidentId = await this.createIncident(
      'EMERGENCY_SHUTDOWN',
      IncidentSeverity.CRITICAL,
      `Emergency shutdown initiated: ${reason}`,
      performedBy,
      { affectedSystems: services || ['ALL'] },
    );

    this.logger.error(`EMERGENCY SHUTDOWN INITIATED: ${reason}`);

    // Execute shutdown actions
    if (!services || services.includes('ALL')) {
      // Shutdown all services
      await this.executeEmergencyAction('shutdown_all');
    } else {
      // Shutdown specific services
      for (const service of services) {
        await this.executeEmergencyAction(`shutdown_${service}`);
      }
    }

    await this.addTimelineEntry(
      incidentId.id,
      'EMERGENCY_SHUTDOWN_EXECUTED',
      performedBy,
      `Services shutdown: ${services?.join(', ') || 'ALL'}`,
    );
  }

  /**
   * Execute emergency action
   */
  async executeEmergencyAction(actionName: string): Promise<void> {
    const action = this.emergencyActions.get(actionName);
    
    if (!action) {
      throw new Error(`Emergency action ${actionName} not found`);
    }

    this.logger.warn(`Executing emergency action: ${actionName}`);

    try {
      await action.execute();
      this.logger.log(`Emergency action ${actionName} completed successfully`);
    } catch (error:any) {
      this.logger.error(`Emergency action ${actionName} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Register emergency actions
   */
  private registerEmergencyActions(): void {
    // Disable withdrawals
    this.emergencyActions.set('disable_withdrawals', {
      name: 'Disable Withdrawals',
      description: 'Disable all withdrawal operations',
      severity: IncidentSeverity.HIGH,
      execute: async () => {
        await this.redis.set('emergency:withdrawals_disabled', 'true');
        this.logger.warn('Withdrawals disabled');
      },
    });

    // Disable trading
    this.emergencyActions.set('disable_trading', {
      name: 'Disable Trading',
      description: 'Disable all trading operations',
      severity: IncidentSeverity.HIGH,
      execute: async () => {
        await this.redis.set('emergency:trading_disabled', 'true');
        this.logger.warn('Trading disabled');
      },
    });

    // Enable maintenance mode
    this.emergencyActions.set('enable_maintenance', {
      name: 'Enable Maintenance Mode',
      description: 'Enable maintenance mode for all services',
      severity: IncidentSeverity.MEDIUM,
      execute: async () => {
        await this.redis.set('emergency:maintenance_mode', 'true');
        this.logger.warn('Maintenance mode enabled');
      },
    });

    // Block suspicious IPs
    this.emergencyActions.set('block_suspicious_ips', {
      name: 'Block Suspicious IPs',
      description: 'Block all IPs flagged as suspicious',
      severity: IncidentSeverity.HIGH,
      execute: async () => {
        const suspiciousIPs = await this.redis.smembers('suspicious_ips');
        for (const ip of suspiciousIPs) {
          await this.redis.sadd('blocked_ips', ip);
        }
        this.logger.warn(`Blocked ${suspiciousIPs.length} suspicious IPs`);
      },
    });

    // Shutdown all services
    this.emergencyActions.set('shutdown_all', {
      name: 'Shutdown All Services',
      description: 'Emergency shutdown of all services',
      severity: IncidentSeverity.CRITICAL,
      execute: async () => {
        await this.redis.set('emergency:shutdown', 'true');
        await this.redis.set('emergency:withdrawals_disabled', 'true');
        await this.redis.set('emergency:trading_disabled', 'true');
        await this.redis.set('emergency:deposits_disabled', 'true');
        this.logger.error('ALL SERVICES SHUTDOWN');
      },
    });
  }

  /**
   * Get active incidents
   */
  async getActiveIncidents(): Promise<SecurityIncident[]> {
    const ids = await this.redis.smembers('active_incidents');
    const incidents: SecurityIncident[] = [];

    for (const id of ids) {
      const data = await this.redis.get(`incident:${id}`);
      if (data) {
        incidents.push(JSON.parse(data));
      }
    }

    return incidents.sort((a, b) => {
      const severityOrder = {
        [IncidentSeverity.CRITICAL]: 0,
        [IncidentSeverity.HIGH]: 1,
        [IncidentSeverity.MEDIUM]: 2,
        [IncidentSeverity.LOW]: 3,
      };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Get incident by ID
   */
  async getIncident(incidentId: string): Promise<SecurityIncident | null> {
    const data = await this.redis.get(`incident:${incidentId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Trigger alert (integrate with PagerDuty, Slack, etc.)
   */
  private async triggerAlert(incident: SecurityIncident): Promise<void> {
    // In production, integrate with alerting services
    this.logger.error(`ALERT: ${incident.severity} incident - ${incident.type}`);
    
    // Store alert
    await this.redis.lpush('security_alerts', JSON.stringify({
      incidentId: incident.id,
      severity: incident.severity,
      type: incident.type,
      timestamp: new Date(),
    }));
  }

  /**
   * Check if system is in emergency mode
   */
  async isEmergencyMode(): Promise<boolean> {
    const shutdown = await this.redis.get('emergency:shutdown');
    return shutdown === 'true';
  }

  /**
   * Check if specific feature is disabled
   */
  async isFeatureDisabled(feature: string): Promise<boolean> {
    const disabled = await this.redis.get(`emergency:${feature}_disabled`);
    return disabled === 'true';
  }

  /**
   * Restore normal operations
   */
  async restoreOperations(performedBy: string, reason: string): Promise<void> {
    await this.redis.del('emergency:shutdown');
    await this.redis.del('emergency:withdrawals_disabled');
    await this.redis.del('emergency:trading_disabled');
    await this.redis.del('emergency:deposits_disabled');
    await this.redis.del('emergency:maintenance_mode');

    this.logger.log(`Normal operations restored by ${performedBy}: ${reason}`);
  }

  /**
   * Generate incident report
   */
  async generateIncidentReport(incidentId: string): Promise<string> {
    const incident = await this.getIncident(incidentId);
    if (!incident) {
      throw new Error('Incident not found');
    }

    const report = `
SECURITY INCIDENT REPORT
========================

Incident ID: ${incident.id}
Type: ${incident.type}
Severity: ${incident.severity}
Status: ${incident.status}

Detection:
- Detected At: ${incident.detectedAt}
- Detected By: ${incident.detectedBy}

Impact:
- Affected Systems: ${incident.affectedSystems.join(', ') || 'None'}
- Affected Users: ${incident.affectedUsers.length} users

Description:
${incident.description}

Timeline:
${incident.timeline.map(entry => 
  `[${entry.timestamp}] ${entry.action} by ${entry.performedBy}\n  ${entry.details}`
).join('\n')}

${incident.resolvedAt ? `Resolved At: ${incident.resolvedAt}` : 'Status: Ongoing'}

${incident.postMortem ? `\nPost-Mortem:\n${incident.postMortem}` : ''}
`;

    return report;
  }
}
