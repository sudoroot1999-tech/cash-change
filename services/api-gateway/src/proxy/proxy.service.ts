import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig, Method } from 'axios';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly services: Record<string, string>;

  constructor(configService: ConfigService) {
    this.services = {
      users: configService.get('USER_SERVICE_URL', 'http://localhost:3001'),
      auth: configService.get('AUTH_SERVICE_URL', 'http://localhost:3002'),
      wallets: configService.get('WALLET_SERVICE_URL', 'http://localhost:3003'),
      trading: configService.get('TRADING_SERVICE_URL', 'http://localhost:3004'),
      market: configService.get('MARKET_DATA_URL', 'http://localhost:3005'),
      notifications: configService.get('NOTIFICATION_URL', 'http://localhost:3006'),
      compliance: configService.get('COMPLIANCE_URL', 'http://localhost:3007'),
      security: configService.get('SECURITY_URL', 'http://localhost:3008'),
      reserves: configService.get('RESERVES_URL', 'http://localhost:3009'),
    };
  }

  async forward(service: string, path: string, method: Method, body?: any, headers?: Record<string, string>, query?: Record<string, string>) {
    const baseUrl = this.services[service];
    if (!baseUrl) throw new HttpException(`Unknown service: ${service}`, 400);

    const url = new URL(`${baseUrl}/api/v1${path}`);
    if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));

    const config: AxiosRequestConfig = {
      method,
      url: url.toString(),
      data: body,
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 30000,
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Proxy error: ${error.message}`, error.stack);
      if (error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }
      throw new HttpException('Service unavailable', 503);
    }
  }
}
