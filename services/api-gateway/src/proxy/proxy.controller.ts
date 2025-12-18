import { Controller, All, Req, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

// Route mappings: path prefix -> service name
const ROUTES: Record<string, string> = {
  '/users': 'users',
  '/auth': 'auth',
  '/wallets': 'wallets',
  '/assets': 'wallets',
  '/transactions': 'wallets',
  '/orders': 'trading',
  '/pairs': 'trading',
  '/market': 'market',
  '/notifications': 'notifications',
  '/kyc': 'compliance',
  '/aml': 'compliance',
  '/threats': 'security',
  '/mpc': 'security',
  '/reserves': 'reserves',
};

@ApiTags('Proxy')
@Controller()
@UseGuards(ThrottlerGuard)
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.path.replace('/api/v1', '');
    
    // Find matching service
    const serviceEntry = Object.entries(ROUTES).find(([prefix]) => path.startsWith(prefix));
    if (!serviceEntry) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Route not found' });
    }

    const [_prefix, service] = serviceEntry;
    const servicePath = path; // Keep full path for service
    
    // Forward user info if authenticated
    const headers: Record<string, string> = {};
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }
    if ((req as any).user) {
      headers['X-User-Id'] = (req as any).user.userId;
      headers['X-User-Tier'] = (req as any).user.tier;
    }

    try {
      const result = await this.proxyService.forward(
        service,
        servicePath,
        req.method as any,
        req.body,
        headers,
        req.query as Record<string, string>,
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(error.status || 500).json(error.response || { error: error.message });
    }
  }
}
