import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIp = this.getClientIp(request);
    const user = request.user;

    // Check global IP whitelist
    const globalWhitelist = this.configService
      .get<string>('ADMIN_IP_WHITELIST', '')
      .split(',')
      .map((ip) => ip.trim())
      .filter((ip) => ip);

    // Check user-specific IP whitelist
    const userWhitelist = user?.ipWhitelist || [];

    const combinedWhitelist = [...globalWhitelist, ...userWhitelist];

    // If no whitelist is configured, allow access
    if (combinedWhitelist.length === 0) {
      return true;
    }

    // Check if client IP is in whitelist
    const isWhitelisted = combinedWhitelist.some((ip) => {
      if (ip.includes('/')) {
        // CIDR notation support
        return this.ipInCidr(clientIp, ip);
      }
      return ip === clientIp || ip === '*';
    });

    if (!isWhitelisted) {
      throw new ForbiddenException(`Access denied from IP: ${clientIp}`);
    }

    return true;
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      ''
    );
  }

  private ipInCidr(ip: string, cidr: string): boolean {
    // Simple CIDR check (can be improved with a library like ip-cidr)
    const [range, bits] = cidr.split('/');
    if (!bits) return ip === range;
    
    // For simplicity, just match the prefix
    const ipParts = ip.split('.');
    const rangeParts = range.split('.');
    const prefixLength = Math.floor(parseInt(bits) / 8);
    
    for (let i = 0; i < prefixLength; i++) {
      if (ipParts[i] !== rangeParts[i]) {
        return false;
      }
    }
    return true;
  }
}
