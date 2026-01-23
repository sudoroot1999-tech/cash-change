import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrustedDevice } from '../entities/trusted-device.entity';
import { SecurityEvent } from '../entities/security-event.entity';
import * as crypto from 'crypto';
import { NotFoundError, RISK_LEVELS, SECURITY_EVENT_TYPES, SecurityEventType } from '@exchange/common';

export interface DeviceInfo {
  fingerprint: string;
  browser?: string;
  os?: string;
  device?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class DeviceFingerprintService {
  private readonly logger = new Logger(DeviceFingerprintService.name);

  constructor(
    @InjectRepository(TrustedDevice)
    private trustedDeviceRepository: Repository<TrustedDevice>,
    @InjectRepository(SecurityEvent)
    private securityEventRepository: Repository<SecurityEvent>,
  ) { }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(
    userId: string,
    fingerprint: string,
  ): Promise<boolean> {
    const device = await this.trustedDeviceRepository.findOne({
      where: { userId, fingerprint, isTrusted: true },
    });

    return !!device;
  }

  /**
   * Register new device
   */
  async registerDevice(
    userId: string,
    deviceInfo: DeviceInfo,
    location?: { country?: string; city?: string },
  ): Promise<TrustedDevice> {
    const existingDevice = await this.trustedDeviceRepository.findOne({
      where: { userId, fingerprint: deviceInfo.fingerprint },
    });

    if (existingDevice) {
      // Update last used
      existingDevice.lastUsedAt = new Date();
      existingDevice.ipAddress = deviceInfo.ipAddress;
      return await this.trustedDeviceRepository.save(existingDevice);
    }

    const device = this.trustedDeviceRepository.create({
      userId,
      fingerprint: deviceInfo.fingerprint,
      metadata: {
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device: deviceInfo.device,
        screenResolution: deviceInfo.screenResolution,
        timezone: deviceInfo.timezone,
        language: deviceInfo.language,
      },
      ipAddress: deviceInfo.ipAddress,
      countryCode: location?.country,
      city: location?.city,
      isTrusted: false, // New devices are not trusted by default
      lastUsedAt: new Date(),
    });

    await this.trustedDeviceRepository.save(device);

    // Log new device event
    await this.logSecurityEvent(userId, SECURITY_EVENT_TYPES.NEW_DEVICE, {
      fingerprint: deviceInfo.fingerprint,
      deviceInfo: deviceInfo,
      location,
    });

    this.logger.log(`New device registered for user ${userId}`);
    return device;
  }

  /**
   * Trust a device
   */
  async trustDevice(
    userId: string,
    deviceId: string,
  ): Promise<TrustedDevice> {
    const device = await this.trustedDeviceRepository.findOne({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundError('Device not found');
    }

    device.isTrusted = true;
    return await this.trustedDeviceRepository.save(device);
  }

  /**
   * Revoke device trust
   */
  async revokeDeviceTrust(
    userId: string,
    deviceId: string,
  ): Promise<void> {
    await this.trustedDeviceRepository.update(
      { id: deviceId, userId },
      { isTrusted: false },
    );

    this.logger.log(`Device trust revoked for user ${userId}, device ${deviceId}`);
  }

  /**
   * Get all user devices
   */
  async getUserDevices(userId: string): Promise<TrustedDevice[]> {
    return await this.trustedDeviceRepository.find({
      where: { userId },
      order: { lastUsedAt: 'DESC' },
    });
  }

  /**
   * Delete device
   */
  async deleteDevice(userId: string, deviceId: string): Promise<void> {
    await this.trustedDeviceRepository.delete({ id: deviceId, userId });
    this.logger.log(`Device deleted for user ${userId}, device ${deviceId}`);
  }

  /**
   * Check if this is a new device for the user
   */
  async isNewDevice(userId: string, fingerprint: string): Promise<boolean> {
    const device = await this.trustedDeviceRepository.findOne({
      where: { userId, fingerprint },
    });

    return !device;
  }

  /**
   * Generate device fingerprint from request data
   */
  generateFingerprint(data: {
    userAgent: string;
    acceptLanguage?: string;
    acceptEncoding?: string;
    ipAddress: string;
  }): string {
    const hash = crypto.createHash('sha256');
    hash.update(data.userAgent);
    if (data.acceptLanguage) hash.update(data.acceptLanguage);
    if (data.acceptEncoding) hash.update(data.acceptEncoding);
    hash.update(data.ipAddress);

    return hash.digest('hex');
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
      riskLevel: RISK_LEVELS.MEDIUM,
      details,
    });

    await this.securityEventRepository.save(event);
  }
}
