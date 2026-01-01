import {
  Injectable,
  BadRequestException,
  TooManyRequestsException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { VerificationCode, VerificationCodeType } from '../entities/verification-code.entity';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @InjectRepository(VerificationCode)
    private readonly verificationCodeRepository: Repository<VerificationCode>,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate and send email verification code
   */
  async sendVerificationCode(
    userId: string,
    email: string,
    type: VerificationCodeType,
  ): Promise<{ expiresInMinutes: number }> {
    // Check rate limiting - max 3 codes per 15 minutes
    const recentCodes = await this.verificationCodeRepository.count({
      where: {
        email,
        type,
        createdAt: MoreThan(new Date(Date.now() - 15 * 60 * 1000)), // 15 minutes ago
      },
    });

    if (recentCodes >= 3) {
      throw new TooManyRequestsException(
        'Too many verification codes requested. Please wait 15 minutes.',
      );
    }

    // Invalidate any existing unused codes for this user/type
    await this.verificationCodeRepository.update(
      {
        userId,
        type,
        usedAt: null,
      },
      {
        usedAt: new Date(), // Mark as used to invalidate
      },
    );

    // Generate 6-digit code
    const code = this.generateCode();
    const expiresInMinutes = 10; // 10 minutes expiration
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // Save verification code
    const verificationCode = this.verificationCodeRepository.create({
      userId,
      email,
      code,
      type,
      expiresAt,
    });

    await this.verificationCodeRepository.save(verificationCode);

    // Send email via notification service
    await this.sendCodeEmail(email, code, type, expiresInMinutes);

    this.logger.log(`Verification code sent to ${email} for user ${userId}`);
    return { expiresInMinutes };
  }

  /**
   * Verify email code
   */
  async verifyCode(
    email: string,
    code: string,
    type: VerificationCodeType,
  ): Promise<{ userId: string; valid: boolean }> {
    // Find the most recent unused code
    const verificationCode = await this.verificationCodeRepository.findOne({
      where: {
        email,
        code,
        type,
        usedAt: null,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!verificationCode) {
      // Increment attempts for any existing codes
      await this.verificationCodeRepository
        .createQueryBuilder()
        .update(VerificationCode)
        .set({ attempts: () => 'attempts + 1' })
        .where('email = :email AND type = :type AND used_at IS NULL', { email, type })
        .execute();

      return { userId: '', valid: false };
    }

    // Check max attempts
    if (verificationCode.attempts >= verificationCode.maxAttempts) {
      throw new BadRequestException('Maximum verification attempts exceeded');
    }

    // Mark as used
    verificationCode.usedAt = new Date();
    await this.verificationCodeRepository.save(verificationCode);

    this.logger.log(`Email code verified for ${email}`);
    return { userId: verificationCode.userId, valid: true };
  }

  /**
   * Generate 6-digit numeric code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send verification code email
   */
  private async sendCodeEmail(
    email: string,
    code: string,
    type: VerificationCodeType,
    expiresInMinutes: number,
  ): Promise<void> {
    let subject: string;
    let content: string;

    switch (type) {
      case VerificationCodeType.LOGIN_VERIFICATION:
        subject = 'Login Verification Code';
        content = `Your login verification code is: ${code}. This code expires in ${expiresInMinutes} minutes.`;
        break;
      case VerificationCodeType.REGISTRATION_VERIFICATION:
        subject = 'Registration Verification Code';
        content = `Welcome! Your registration verification code is: ${code}. This code expires in ${expiresInMinutes} minutes.`;
        break;
      case VerificationCodeType.EMAIL_2FA:
        subject = 'Two-Factor Authentication Code';
        content = `Your 2FA verification code is: ${code}. This code expires in ${expiresInMinutes} minutes.`;
        break;
      default:
        subject = 'Verification Code';
        content = `Your verification code is: ${code}. This code expires in ${expiresInMinutes} minutes.`;
    }

    try {
      // Send via notification service
      await this.notificationClient
        .emit('send_notification', {
          email,
          channel: 'email',
          subject,
          content,
          priority: 1, // HIGH priority
          metadata: {
            type: 'verification_code',
            code_type: type,
          },
        })
        .toPromise();
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      throw new BadRequestException('Failed to send verification email');
    }
  }

  /**
   * Clean up expired codes (can be called by a cron job)
   */
  async cleanupExpiredCodes(): Promise<void> {
    const result = await this.verificationCodeRepository.delete({
      expiresAt: MoreThan(new Date()),
    });
    
    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired verification codes`);
    }
  }
}