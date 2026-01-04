import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { WithdrawalWhitelist, WhitelistStatus } from '../entities/withdrawal-whitelist.entity';
import { SecurityEvent, SecurityEventType, RiskLevel } from '../entities/security-event.entity';

@Injectable()
export class WithdrawalWhitelistService {
  private readonly logger = new Logger(WithdrawalWhitelistService.name);
  private readonly DEFAULT_COOLING_PERIOD_HOURS = 24;

  constructor(
    @InjectRepository(WithdrawalWhitelist)
    private whitelistRepository: Repository<WithdrawalWhitelist>,
    @InjectRepository(SecurityEvent)
    private securityEventRepository: Repository<SecurityEvent>,
  ) {}

  /**
   * Add address to whitelist
   */
  async addToWhitelist(data: {
    userId: string;
    address: string;
    currency: string;
    label?: string;
    ipAddress?: string;
    coolingPeriodHours?: number;
  }): Promise<WithdrawalWhitelist> {
    const { userId, address, currency, label, ipAddress, coolingPeriodHours } = data;

    // Check if address already exists
    const existing = await this.whitelistRepository.findOne({
      where: { userId, address, currency },
    });

    if (existing && existing.status === WhitelistStatus.ACTIVE) {
      throw new BadRequestException('Address already in whitelist');
    }

    const whitelist = this.whitelistRepository.create({
      userId,
      address,
      currency,
      label,
      status: WhitelistStatus.PENDING,
      coolingPeriodHours: coolingPeriodHours || this.DEFAULT_COOLING_PERIOD_HOURS,
      createdByIp: ipAddress,
      confirmedViaEmail: false,
      confirmedViaSms: false,
    });

    await this.whitelistRepository.save(whitelist);

    // Log security event
    await this.logSecurityEvent(userId, SecurityEventType.WHITELIST_ADDRESS_ADDED, {
      address,
      currency,
      label,
      ipAddress,
    });

    this.logger.log(`Address added to whitelist for user ${userId}: ${address}`);
    return whitelist;
  }

  /**
   * Confirm whitelist address via email
   */
  async confirmViaEmail(
    whitelistId: string,
    userId: string,
  ): Promise<WithdrawalWhitelist> {
    const whitelist = await this.whitelistRepository.findOne({
      where: { id: whitelistId, userId },
    });

    if (!whitelist) {
      throw new BadRequestException('Whitelist entry not found');
    }

    whitelist.confirmedViaEmail = true;
    return await this.checkAndActivate(whitelist);
  }

  /**
   * Confirm whitelist address via SMS
   */
  async confirmViaSms(
    whitelistId: string,
    userId: string,
  ): Promise<WithdrawalWhitelist> {
    const whitelist = await this.whitelistRepository.findOne({
      where: { id: whitelistId, userId },
    });

    if (!whitelist) {
      throw new BadRequestException('Whitelist entry not found');
    }

    whitelist.confirmedViaSms = true;
    return await this.checkAndActivate(whitelist);
  }

  /**
   * Check if whitelist can be activated
   */
  private async checkAndActivate(
    whitelist: WithdrawalWhitelist,
  ): Promise<WithdrawalWhitelist> {
    // Require both email and SMS confirmation
    if (whitelist.confirmedViaEmail && whitelist.confirmedViaSms) {
      // Check cooling period
      const coolingEndTime = new Date(whitelist.createdAt);
      coolingEndTime.setHours(coolingEndTime.getHours() + whitelist.coolingPeriodHours);

      if (new Date() >= coolingEndTime) {
        whitelist.status = WhitelistStatus.ACTIVE;
        whitelist.activatedAt = new Date();
      }
    }

    return await this.whitelistRepository.save(whitelist);
  }

  /**
   * Check if address is whitelisted
   */
  async isAddressWhitelisted(
    userId: string,
    address: string,
    currency: string,
  ): Promise<boolean> {
    const whitelist = await this.whitelistRepository.findOne({
      where: {
        userId,
        address,
        currency,
        status: WhitelistStatus.ACTIVE,
      },
    });

    return !!whitelist;
  }

  /**
   * Get user's whitelisted addresses
   */
  async getUserWhitelist(
    userId: string,
    currency?: string,
  ): Promise<WithdrawalWhitelist[]> {
    const where: any = { userId };
    if (currency) {
      where.currency = currency;
    }

    return await this.whitelistRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Remove address from whitelist
   */
  async removeFromWhitelist(
    userId: string,
    whitelistId: string,
  ): Promise<void> {
    const whitelist = await this.whitelistRepository.findOne({
      where: { id: whitelistId, userId },
    });

    if (!whitelist) {
      throw new BadRequestException('Whitelist entry not found');
    }

    whitelist.status = WhitelistStatus.REVOKED;
    await this.whitelistRepository.save(whitelist);

    this.logger.log(`Address removed from whitelist for user ${userId}: ${whitelistId}`);
  }

  /**
   * Check if cooling period has passed
   */
  async isCoolingPeriodPassed(whitelistId: string): Promise<boolean> {
    const whitelist = await this.whitelistRepository.findOne({
      where: { id: whitelistId },
    });

    if (!whitelist) {
      return false;
    }

    const coolingEndTime = new Date(whitelist.createdAt);
    coolingEndTime.setHours(coolingEndTime.getHours() + whitelist.coolingPeriodHours);

    return new Date() >= coolingEndTime;
  }

  /**
   * Activate pending whitelists after cooling period
   */
  async activatePendingWhitelists(): Promise<void> {
    const pending = await this.whitelistRepository.find({
      where: {
        status: WhitelistStatus.PENDING,
        confirmedViaEmail: true,
        confirmedViaSms: true,
      },
    });

    for (const whitelist of pending) {
      const coolingEndTime = new Date(whitelist.createdAt);
      coolingEndTime.setHours(coolingEndTime.getHours() + whitelist.coolingPeriodHours);

      if (new Date() >= coolingEndTime) {
        whitelist.status = WhitelistStatus.ACTIVE;
        whitelist.activatedAt = new Date();
        await this.whitelistRepository.save(whitelist);
        this.logger.log(`Whitelist activated: ${whitelist.id}`);
      }
    }
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
      riskLevel: RiskLevel.MEDIUM,
      details,
    });

    await this.securityEventRepository.save(event);
  }
}
