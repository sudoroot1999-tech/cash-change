import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AntiPhishingCode } from '../entities/anti-phishing-code.entity';
import { SecurityEvent, SecurityEventType, RiskLevel } from '../entities/security-event.entity';
import * as crypto from 'crypto';

@Injectable()
export class AntiPhishingService {
  private readonly logger = new Logger(AntiPhishingService.name);

  constructor(
    @InjectRepository(AntiPhishingCode)
    private antiPhishingCodeRepository: Repository<AntiPhishingCode>,
    @InjectRepository(SecurityEvent)
    private securityEventRepository: Repository<SecurityEvent>,
  ) { }

  /**
   * Set or update anti-phishing code for user
   */
  async setAntiPhishingCode(
    userId: string,
    phishingCode: string,
    ipAddress?: string,
  ): Promise<{
    success: boolean,
    data: AntiPhishingCode
  }> {
    // Validate code
    if (!phishingCode || phishingCode.length < 4 || phishingCode.length > 50) {
      throw new BadRequestException('Anti-phishing code must be between 4 and 50 characters');
    }

    // Check if user already has a code
    let existingCode = await this.antiPhishingCodeRepository.findOne({
      where: { userId },
    });

    if (existingCode) {
      existingCode.phishingCode = phishingCode;
      existingCode.isActive = true;
      await this.antiPhishingCodeRepository.save(existingCode);
    } else {
      existingCode = this.antiPhishingCodeRepository.create({
        userId,
        phishingCode,
        isActive: true,
      });
      await this.antiPhishingCodeRepository.save(existingCode);
    }

    // Log security event
    await this.logSecurityEvent(userId, SecurityEventType.PASSWORD_CHANGE, {
      action: 'Anti-phishing code updated',
      ipAddress,
    });

    this.logger.log(`Anti-phishing code set for user ${userId}`);
    return {
      success: true,
      data: existingCode,
    };
  }

  /**
   * Get user's anti-phishing code
   */
  async getAntiPhishingCode(userId: string): Promise<AntiPhishingCode | null> {
    return await this.antiPhishingCodeRepository.findOne({
      where: { userId, isActive: true },
    });
  }

  /**
   * Verify anti-phishing code in email
   */
  async verifyAntiPhishingCode(
    userId: string,
    providedCode: string,
  ): Promise<boolean> {
    const code = await this.getAntiPhishingCode(userId);

    if (!code) {
      return false;
    }

    return code.phishingCode === providedCode;
  }

  /**
   * Get anti-phishing code for email template
   */
  async getCodeForEmail(userId: string): Promise<string> {
    const code = await this.getAntiPhishingCode(userId);
    return code ? code.phishingCode : 'NOT_SET';
  }

  /**
   * Deactivate anti-phishing code
   */
  async deactivateCode(userId: string): Promise<void> {
    await this.antiPhishingCodeRepository.update(
      { userId },
      { isActive: false },
    );
  }

  /**
   * Generate random anti-phishing code suggestion
   */
  generateRandomCode(): { success: boolean, data: string } {
    const words = [
      'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot',
      'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima',
    ];

    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = words[Math.floor(Math.random() * words.length)];
    const number = Math.floor(Math.random() * 1000);

    return {
      success: true,
      data: `${word1}-${word2}-${number}`,
    };
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
      riskLevel: RiskLevel.LOW,
      details,
    });

    await this.securityEventRepository.save(event);
  }
}
