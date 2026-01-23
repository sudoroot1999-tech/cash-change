import { Controller, All, Req, Res, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@exchange/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';

// Route mappings: path prefix -> service name
const ROUTES: Record<string, string> = {
  '/admin': 'admin',
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
@Public()
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) { }

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.path.replace('/api/v1', '');

    // If it's not a public path and we don't have a user, the JwtAuthGuard will handle validation
    // The JwtAuthGuard will check the @Public() metadata

    // Find matching service
    const serviceEntry = Object.entries(ROUTES).find(([prefix]) => path.startsWith(prefix));
    if (!serviceEntry) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Route not found' });
    }

    const [_prefix, service] = serviceEntry;
    const servicePath = path;

    // Forward user info
    const headers: Record<string, string> = {};
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }
    if (req.headers['user-agent']) {
      headers['user-agent'] = req.headers['user-agent'];
    }
    if (req.headers['accept-language']) {
      headers['accept-language'] = req.headers['accept-language'];
    }
    if (req.headers['accept-encoding']) {
      headers['accept-encoding'] = req.headers['accept-encoding'];
    }
    // headers['x-forwarded-for'] = req.ip ? req.ip : '127.0.0.1';

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
