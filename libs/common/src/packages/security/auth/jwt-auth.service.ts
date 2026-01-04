import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class JWTAuthService {
  constructor(private jwtService: JwtService) {}

  /**
   * Generate access and refresh tokens
   */
  async generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<TokenPair> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const jwtPayload: JWTPayload = {
      ...payload,
      sessionId,
    };

    const accessToken = this.jwtService.sign(jwtPayload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(
      { sub: payload.sub, sessionId },
      {
        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

    /**
   * Generate random token for email verification, password reset, etc.
   */
  generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate anti-phishing code
   */
  generateAntiPhishingCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<{ sub: string; sessionId: string }> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    refreshToken: string,
    userPayload: Omit<JWTPayload, 'iat' | 'exp' | 'sessionId'>,
  ): Promise<TokenPair> {
    const decoded = await this.verifyRefreshToken(refreshToken);

    const jwtPayload: JWTPayload = {
      ...userPayload,
      sessionId: decoded.sessionId,
    };

    const accessToken = this.jwtService.sign(jwtPayload, {
      expiresIn: '15m',
    });

    return {
      accessToken,
      refreshToken, // Keep the same refresh token
      expiresIn: 15 * 60,
    };
  }

  /**
   * Generate service-to-service token
   */
  generateServiceToken(serviceName: string, permissions: string[]): string {
    return this.jwtService.sign(
      {
        sub: serviceName,
        type: 'service',
        permissions,
      },
      {
        expiresIn: '1h',
      },
    );
  }

  /**
   * Verify service token
   */
  async verifyServiceToken(token: string): Promise<{ sub: string; permissions: string[] }> {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type !== 'service') {
        throw new UnauthorizedException('Invalid service token');
      }
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired service token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }
}
