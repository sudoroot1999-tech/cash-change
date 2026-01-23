import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AntiPhishingCode } from '../entities/anti-phishing-code.entity';
import { SecurityEvent } from '../entities/security-event.entity';
import { BadRequestError, NotFoundError, RISK_LEVELS, SECURITY_EVENT_TYPES, SecurityEventType } from '@exchange/common';

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
  ): Promise<AntiPhishingCode> {
    try {
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
      await this.logSecurityEvent(userId, SECURITY_EVENT_TYPES.PASSWORD_CHANGE, {
        action: 'Anti-phishing code updated',
        ipAddress,
      });

      this.logger.log(`Anti-phishing code set for user ${userId}`);
      return existingCode
    }
    catch (error) {
      throw new BadRequestError('an error happen while setting code')
    }
  }

  /**
   * Get user's anti-phishing code
   */
  async getAntiPhishingCode(userId: string): Promise<AntiPhishingCode | null> {
    try {
      const antiPhishingCode = await this.antiPhishingCodeRepository.findOne({
        where: { userId, isActive: true },
      });

      if (!antiPhishingCode) throw new NotFoundError("not found code for this user")

      return antiPhishingCode
    }
    catch (error) {
      throw new BadRequestError('an error happen while getting code')
    }
  }

  /**
   * Verify anti-phishing code in email
   */
  async verifyAntiPhishingCode(
    userId: string,
    providedCode: string,
  ): Promise<boolean> {
    try {
      const data = await this.getAntiPhishingCode(userId);
      data.phishingCode === providedCode;
      await this.antiPhishingCodeRepository.save(data)
      return true
    }
    catch (error) {
      throw new NotFoundError("can not find your antiphishing code")
    }
  }

  /**
   * Get anti-phishing code for email template
   */
  async getCodeForEmail(userId: string): Promise<string> {
    try {
      const data = await this.getAntiPhishingCode(userId);
      return data.phishingCode ? data.phishingCode : 'NOT_SET';
    }
    catch (error) {
      throw new NotFoundError("can not find your antiphishing code")
    }
  }

  /**
   * Deactivate anti-phishing code
   */
  async deactivateCode(userId: string): Promise<string> {
    try {
      await this.antiPhishingCodeRepository.update(
        { userId },
        { isActive: false },
      );
      return 'Your code deactivate'

    }
    catch (error) {
      throw new BadRequestError('can not deactiveate your code')
    }
  }

  /**
   * Generate random anti-phishing code suggestion
   */
  generateRandomCode(): string {
    const words = [
      'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot',
      'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima',
    ];

    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = words[Math.floor(Math.random() * words.length)];
    const number = Math.floor(Math.random() * 1000);

    return `${word1}-${word2}-${number}`;
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
      riskLevel: RISK_LEVELS.LOW,
      details,
    });

    await this.securityEventRepository.save(event);
  }
}
