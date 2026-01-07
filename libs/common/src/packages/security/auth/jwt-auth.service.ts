import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { JwtPayload, TokenPair } from '../../../types';

@Injectable()
export class JWTAuthService {
  constructor(private jwtService: JwtService) { }

  /**
   * Generate access and refresh tokens
   */
  async generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<TokenPair> {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const jwtPayload: JwtPayload = {
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
      tokenType: 'Bearer',
    };
  }

  /**
 * Generate random token for email verification, password reset, etc.
 */
  generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }


  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const { sessionId, ...others } = this.jwtService.verify(token);
      return { ...others };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    refreshToken: string,
    userPayload: Omit<JwtPayload, 'iat' | 'exp' | 'sessionId'>,
  ): Promise<TokenPair> {
    const decoded = await this.verifyRefreshToken(refreshToken);

    const jwtPayload: JwtPayload = {
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
      tokenType: 'Bearer',
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
