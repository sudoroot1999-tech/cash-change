import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, USER_STATUS } from '@exchange/common';
import { USER_PORT } from '../tokens/auth.tokens';
import { UserPort } from '../ports/user.port';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(USER_PORT) private readonly users: UserPort
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });

  }

  async validate(payload: JwtPayload) {

    const user = await this.users.findById(payload.sub);

    if (!user || user.status !== USER_STATUS.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      ...user
    };
  }
}
