import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as geoip from 'geoip-lite';
import { SecurityEvent, SecurityEventType, SecuritySeverity } from './entities/security-event.entity';

@Injectable()
export class ThreatsService {
  private readonly logger = new Logger(ThreatsService.name);

  constructor(
    @InjectRepository(SecurityEvent)
    private readonly eventRepository: Repository<SecurityEvent>,
  ) {}

  async logEvent(
    userId: string,
    type: SecurityEventType,
    ipAddress: string,
    userAgent: string,
    metadata: Record<string, any> = {},
  ): Promise<SecurityEvent> {
    const geo = geoip.lookup(ipAddress);
    const enrichedMetadata = {
      ...metadata,
      geo: geo ? { country: geo.country, city: geo.city } : null,
    };

    let severity = SecuritySeverity.INFO;
    if (type === SecurityEventType.LOGIN_FAILURE) severity = SecuritySeverity.LOW;
    if (type === SecurityEventType.WITHDRAWAL_REQUEST) severity = SecuritySeverity.MEDIUM;

    // Basic heuristic: if geo country is different from last successful login, flag high
    if (userId && type === SecurityEventType.LOGIN_SUCCESS) {
      const lastLogin = await this.eventRepository.findOne({
        where: { userId, type: SecurityEventType.LOGIN_SUCCESS },
        order: { createdAt: 'DESC' },
      });

      if (lastLogin && lastLogin.metadata?.geo?.country !== enrichedMetadata.geo?.country) {
        severity = SecuritySeverity.HIGH;
        this.logger.warn(`Suspicious login for user ${userId}: Geo mismatch`);
      }
    }

    const event = this.eventRepository.create({
      userId,
      type,
      severity,
      ipAddress,
      userAgent,
      metadata: enrichedMetadata,
    });

    return this.eventRepository.save(event);
  }

  async analyzeRisk(userId: string): Promise<number> {
    // Determine risk score 0-100 based on recent events
    const recentEvents = await this.eventRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    let score = 0;
    let failCount = 0;

    for (const event of recentEvents) {
      if (event.severity === SecuritySeverity.CRITICAL) score += 50;
      if (event.severity === SecuritySeverity.HIGH) score += 20;
      if (event.type === SecurityEventType.LOGIN_FAILURE) failCount++;
    }

    if (failCount > 5) score += 30;

    return Math.min(score, 100);
  }
}
