import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { Session } from '../sessions/entities/session.entity';

// User entity reference (shared from user-service schema)
interface User {
  id: string;
  email: string;
  passwordHash: string;
  status: string;
  tier: string;
  kycLevel: number;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    // In production, this would call the user-service via gRPC/HTTP
    // For now, we'll use direct database access
    const user = await this.findUserByEmail(email);
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) return null;

    if (user.status !== 'active' && user.status !== 'pending') {
      throw new UnauthorizedException('Account is suspended or banned');
    }

    return user;
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(user: User, deviceInfo?: Record<string, unknown>, ipAddress?: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      tier: user.tier,
      kycLevel: user.kycLevel,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.generateRefreshToken();
    const expiresIn = this.configService.get('JWT_EXPIRES_IN', '15m');

    // Store session
    await this.createSession(user.id, refreshToken, deviceInfo, ipAddress);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(expiresIn),
      tokenType: 'Bearer',
    };
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken: string) {
    const session = await this.sessionRepository.findOne({
      where: { refreshTokenHash: this.hashToken(refreshToken) },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get user (in production, call user-service)
    const user = await this.findUserById(session.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Rotate refresh token
    await this.sessionRepository.delete(session.id);

    return this.generateTokens(user, session.deviceInfo, session.ipAddress);
  }

  /**
   * Logout - invalidate session
   */
  async logout(refreshToken: string): Promise<void> {
    await this.sessionRepository.delete({
      refreshTokenHash: this.hashToken(refreshToken),
    });
  }

  /**
   * Logout all sessions for a user
   */
  async logoutAll(userId: string): Promise<void> {
    await this.sessionRepository.delete({ userId });
  }

  /**
   * Setup 2FA - generate secret and QR code
   */
  async setup2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await this.findUserById(userId);
    if (!user) throw new BadRequestException('User not found');

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'CryptoExchange', secret);
    const qrCode = await qrcode.toDataURL(otpAuthUrl);

    return { secret, qrCode };
  }

  /**
   * Verify 2FA code
   */
  verify2FACode(secret: string, code: string): boolean {
    return authenticator.verify({ token: code, secret });
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  // Helper methods
  private generateRefreshToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  private hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async createSession(
    userId: string,
    refreshToken: string,
    deviceInfo?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<Session> {
    const refreshExpiresDays = parseInt(this.configService.get('JWT_REFRESH_EXPIRES_DAYS', '7'));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiresDays);

    const session = this.sessionRepository.create({
      userId,
      refreshTokenHash: this.hashToken(refreshToken),
      deviceInfo: deviceInfo || {},
      ipAddress: ipAddress || null,
      expiresAt,
    });

    return this.sessionRepository.save(session);
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15m

    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * multipliers[unit];
  }

  // Placeholder methods - in production these would call user-service
  private async findUserByEmail(_email: string): Promise<User | null> {
    // This would make an HTTP/gRPC call to user-service
    return null;
  }

  private async findUserById(_id: string): Promise<User | null> {
    // This would make an HTTP/gRPC call to user-service
    return null;
  }
}
