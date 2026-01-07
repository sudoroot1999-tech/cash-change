// security-service/src/two-factor/two-factor.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

import { UserTwoFactor } from '../entities/user-two-factor.entity';

export interface UpdateTwoFactorStatusDto {
  isEnabled: boolean;
  lastVerifiedAt?: Date;
}


@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(UserTwoFactor)
    private readonly twoFactorRepo: Repository<UserTwoFactor>,
  ) { }

  /**
   * Find 2FA record by user ID
   */
  async findByUserId(userId: string): Promise<UserTwoFactor | null> {
    const twoFactor = await this.twoFactorRepo.findOne({ where: { userId } });
    if (!twoFactor) throw new NotFoundException('2FA not initialized');
    return twoFactor;
  }

  /**
   * Update 2FA record
   */
  async updateTwoFactor(
    userId: string,
    data: UpdateTwoFactorStatusDto,
  ): Promise<UserTwoFactor> {
    const twoFactor = await this.twoFactorRepo.findOne({
      where: { userId },
    });

    if (!twoFactor) {
      throw new NotFoundException('2FA not initialized');
    }

    twoFactor.isEnabled = data.isEnabled;
    twoFactor.lastVerifiedAt = data.lastVerifiedAt ?? new Date();

    return this.twoFactorRepo.save(twoFactor);
  }


  /**
   * Create or rotate 2FA secret
   */
  async generateSecret(userId: string, email: string): Promise<{
    otpauthUrl: any;
    backupCodes: string[];
    secret: any;
  }> {

    const existingTwoFactor = await this.twoFactorRepo.findOne({ where: { userId } });

    const secret = speakeasy.generateSecret({
      name: `Open Exchange (${email})`,
      length: 32,
    });

    const backupCodes = await this.generateAndHashBackupCodes();

    if (existingTwoFactor && !existingTwoFactor?.isEnabled) {
      return {
        otpauthUrl: secret.otpauth_url,
        backupCodes: existingTwoFactor.backupCodes,
        secret: existingTwoFactor.secret
      };
    }

    await this.twoFactorRepo.save({
      userId,
      secret: secret.base32,
      backupCodes,
      isEnabled: false,
    });

    return {
      otpauthUrl: secret.otpauth_url,
      backupCodes,
      secret
    };
  }

  /**
   * Generate QR code
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  /**
   * Verify TOTP token and enable 2FA
   */
  async verifyAndEnable(userId: string, token: string): Promise<boolean> {
    const record = await this.twoFactorRepo.findOne({ where: { userId } });

    if (!record) {
      throw new NotFoundException('2FA not initialized');
    }

    const valid = speakeasy.totp.verify({
      secret: record.secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!valid) {
      return false;
    }

    record.isEnabled = true;
    record.lastVerifiedAt = new Date();

    await this.twoFactorRepo.save(record);
    return true;
  }

  /**
   * Verify TOTP token (login flow)
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const record = await this.twoFactorRepo.findOne({
      where: { userId, isEnabled: true },
    });

    if (!record) return false;

    const valid = speakeasy.totp.verify({
      secret: record.secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (valid) {
      record.lastVerifiedAt = new Date();
      await this.twoFactorRepo.save(record);
    }

    return valid;
  }

  /**
   * Verify backup code (single-use)
   */
  async verifyBackupCode(
    userId: string,
    providedCode: string,
  ): Promise<boolean> {
    const record = await this.twoFactorRepo.findOne({
      where: { userId, isEnabled: true },
    });

    if (!record) return false;

    const hashed = this.hashBackupCode(providedCode);

    if (!record.backupCodes.includes(hashed)) {
      return false;
    }

    //  single-use: remove used code
    record.backupCodes = record.backupCodes.filter(
      (code) => code !== hashed,
    );
    record.lastVerifiedAt = new Date();

    await this.twoFactorRepo.save(record);
    return true;
  }

  /**
   * Disable 2FA
   */
  async disable(userId: string): Promise<void> {
    await this.twoFactorRepo.delete({ userId });
  }

  // =========================
  // Internal helpers
  // =========================

  private async generateAndHashBackupCodes(
    count: number = 10,
  ): Promise<string[]> {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
      const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
      codes.push(this.hashBackupCode(formatted));
    }

    return codes;
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}
