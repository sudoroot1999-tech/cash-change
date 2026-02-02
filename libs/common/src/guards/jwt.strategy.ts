import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, AuthenticatedUser } from '../types/auth.types';
import { USER_STATUS } from '../constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if ((!payload.sub) || (payload.status !== USER_STATUS.ACTIVE)) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      tier: payload.tier,
      kycLevel: payload.kycLevel,
      username: payload.username,
      emailVerified: payload.emailVerified,
      phoneVerified: payload.phoneVerified,
      twoFactorEnabled: payload.twoFactorEnabled,
      status: payload.status,
    };
  }
}
