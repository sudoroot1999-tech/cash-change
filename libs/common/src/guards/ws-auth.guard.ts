import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Unauthorized');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      client.data.user = payload;
      return true;
    } catch {
      throw new WsException('Invalid token');
    }
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (auth?.startsWith('Bearer ')) {
      return auth.substring(7);
    }
    return auth;
  }
}
