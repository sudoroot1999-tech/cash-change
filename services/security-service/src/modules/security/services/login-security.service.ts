import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { LoginHistory, LoginStatus } from '../entities/login-history.entity';
import { UserSession } from '../entities/user-session.entity';
import { SecurityEvent, SecurityEventType, RiskLevel } from '../entities/security-event.entity';

export interface LoginAttemptData {
  userId: string;
  ipAddress: string;
  userAgent?: string;
  deviceFingerprint?: string;
  location?: string;
  countryCode?: string;
  city?: string;
  latitude?: string;
  longitude?: string;
  status: LoginStatus;
  failureReason?: string;
  metadata?: any;
}

@Injectable()
export class LoginSecurityService {
  private readonly logger = new Logger(LoginSecurityService.name);
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 30;
  private readonly MAX_CONCURRENT_SESSIONS = 5;

  constructor(
    @InjectRepository(LoginHistory)
    private loginHistoryRepository: Repository<LoginHistory>,
    @InjectRepository(UserSession)
    private userSessionRepository: Repository<UserSession>,
    @InjectRepository(SecurityEvent)
    private securityEventRepository: Repository<SecurityEvent>,
  ) {}

  /**
   * Log login attempt
   */
  async logLoginAttempt(data: LoginAttemptData): Promise<LoginHistory> {
    const loginHistory = this.loginHistoryRepository.create(data);
    await this.loginHistoryRepository.save(loginHistory);

    // Check for suspicious activity
    if (data.status === LoginStatus.FAILED) {
      await this.checkFailedAttempts(data.userId, data.ipAddress);
    }

    return loginHistory;
  }

  /**
   * Check failed login attempts
   */
  private async checkFailedAttempts(
    userId: string,
    ipAddress: string,
  ): Promise<void> {
    const last30Minutes = new Date();
    last30Minutes.setMinutes(last30Minutes.getMinutes() - 30);

    const failedAttempts = await this.loginHistoryRepository.count({
      where: {
        userId,
        status: LoginStatus.FAILED,
        createdAt: MoreThan(last30Minutes),
      },
    });

    if (failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      await this.logSecurityEvent(userId, SecurityEventType.ACCOUNT_LOCKED, {
        reason: 'Too many failed login attempts',
        failedAttempts,
        ipAddress,
      });

      this.logger.warn(`Account locked for user ${userId} due to failed attempts`);
    }
  }

  /**
   * Get login history for user
   */
  async getLoginHistory(
    userId: string,
    limit: number = 50,
  ): Promise<LoginHistory[]> {
    return await this.loginHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Create user session
   */
  async createSession(data: {
    userId: string;
    sessionToken: string;
    refreshToken?: string;
    deviceFingerprint?: string;
    ipAddress: string;
    userAgent?: string;
    metadata?: any;
    expiresInHours?: number;
  }): Promise<UserSession> {
    // Check concurrent sessions
    await this.enforceConcurrentSessionLimit(data.userId);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (data.expiresInHours || 24));

    const session = this.userSessionRepository.create({
      ...data,
      isActive: true,
      expiresAt,
      lastActivityAt: new Date(),
    });

    return await this.userSessionRepository.save(session);
  }

  /**
   * Enforce concurrent session limit
   */
  private async enforceConcurrentSessionLimit(userId: string): Promise<void> {
    const activeSessions = await this.userSessionRepository.find({
      where: { userId, isActive: true },
      order: { lastActivityAt: 'DESC' },
    });

    if (activeSessions.length >= this.MAX_CONCURRENT_SESSIONS) {
      // Deactivate oldest sessions
      const sessionsToDeactivate = activeSessions.slice(this.MAX_CONCURRENT_SESSIONS - 1);
      
      for (const session of sessionsToDeactivate) {
        session.isActive = false;
        await this.userSessionRepository.save(session);
      }

      this.logger.log(`Deactivated old sessions for user ${userId}`);
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionToken: string): Promise<UserSession | null> {
    const session = await this.userSessionRepository.findOne({
      where: { sessionToken, isActive: true },
    });

    if (!session) {
      return null;
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      session.isActive = false;
      await this.userSessionRepository.save(session);
      return null;
    }

    // Update last activity
    session.lastActivityAt = new Date();
    await this.userSessionRepository.save(session);

    return session;
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: string): Promise<UserSession[]> {
    return await this.userSessionRepository.find({
      where: { userId, isActive: true },
      order: { lastActivityAt: 'DESC' },
    });
  }

  /**
   * Kill specific session
   */
  async killSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.userSessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (session) {
      session.isActive = false;
      await this.userSessionRepository.save(session);
      this.logger.log(`Session killed: ${sessionId}`);
    }
  }

  /**
   * Kill all sessions for user
   */
  async killAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const sessions = await this.userSessionRepository.find({
      where: { userId, isActive: true },
    });

    for (const session of sessions) {
      if (exceptSessionId && session.id === exceptSessionId) {
        continue;
      }
      
      session.isActive = false;
      await this.userSessionRepository.save(session);
    }

    this.logger.log(`All sessions killed for user ${userId}`);
  }

  /**
   * Detect suspicious login patterns
   */
  async detectSuspiciousLogin(
    userId: string,
    currentLogin: {
      ipAddress: string;
      countryCode?: string;
      deviceFingerprint?: string;
    },
  ): Promise<{ isSuspicious: boolean; reasons: string[] }> {
    const reasons: string[] = [];
    let isSuspicious = false;

    // Get recent login history
    const recentLogins = await this.loginHistoryRepository.find({
      where: {
        userId,
        status: LoginStatus.SUCCESS,
      },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    if (recentLogins.length === 0) {
      return { isSuspicious: false, reasons: [] };
    }

    // Check for country change
    const lastCountry = recentLogins[0]?.countryCode;
    if (lastCountry && currentLogin.countryCode && lastCountry !== currentLogin.countryCode) {
      isSuspicious = true;
      reasons.push('Login from different country');
    }

    // Check for new device
    const knownDevices = recentLogins.map(l => l.deviceFingerprint).filter(Boolean);
    if (currentLogin.deviceFingerprint && !knownDevices.includes(currentLogin.deviceFingerprint)) {
      isSuspicious = true;
      reasons.push('Login from new device');
    }

    // Check for rapid location changes (impossible travel)
    const lastLogin = recentLogins[0];
    if (lastLogin && lastLogin.countryCode !== currentLogin.countryCode) {
      const timeDiff = new Date().getTime() - lastLogin.createdAt.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff < 2) {
        isSuspicious = true;
        reasons.push('Impossible travel speed detected');
      }
    }

    return { isSuspicious, reasons };
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(
    userId: string,
    eventType: SecurityEventType,
    details: Record<string, any>,
  ): Promise<void> {
    const event = this.securityEventRepository.create({
      userId,
      eventType,
      riskLevel: RiskLevel.HIGH,
      details,
    });

    await this.securityEventRepository.save(event);
  }
}
