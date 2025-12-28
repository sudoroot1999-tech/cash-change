import { Injectable, NotFoundException, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface MatchingGrpcService {
  cancelOrder(data: { id: string; symbol: string }): any;
}

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);
  private readonly tradingServiceUrl: string;
  private matchingService: MatchingGrpcService;

  constructor(
    @Inject('MATCHING_PACKAGE') private readonly matchingClient: ClientGrpc,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.tradingServiceUrl = this.configService.get(
      'TRADING_SERVICE_URL',
      'http://trading-service:3004',
    );
  }

  onModuleInit() {
    this.matchingService = this.matchingClient.getService<MatchingGrpcService>('MatchingService');
  }

  async findAll(query: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.tradingServiceUrl}/api/v1/orders`, { params: query }),
      );
      return response.data;
    } catch (error: any) {
      throw new NotFoundException('Failed to fetch orders');
    }
  }

  async findById(id: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.tradingServiceUrl}/api/v1/orders/${id}`),
      );
      return response.data;
    } catch (error: any) {
      throw new NotFoundException(`Order ${id} not found`);
    }
  }

  async cancelOrder(id: string, reason?: string) {
    // First get order details to get symbol for gRPC
    let order: any;
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.tradingServiceUrl}/api/v1/orders/${id}`),
      );
      order = response.data;
    } catch (error: any) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // Try gRPC first, fallback to HTTP
    if (order?.symbol) {
      try {
        const result = await this.matchingService
          .cancelOrder({ id, symbol: order.symbol })
          .toPromise();
        this.logger.log(`Cancelled order ${id} via gRPC`);
        return result;
      } catch (grpcError: any) {
        this.logger.warn(`gRPC cancel failed, falling back to HTTP: ${grpcError.message}`);
      }
    }

    // Fallback to HTTP
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.tradingServiceUrl}/api/v1/orders/${id}/cancel`, {
          reason,
        }),
      );
      return response.data;
    } catch (error: any) {
      throw new NotFoundException(`Failed to cancel order ${id}`);
    }
  }

  async getOrderStats() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.tradingServiceUrl}/api/v1/orders/stats`),
      );
      return response.data;
    } catch (error: any) {
      return {
        total: 0,
        pending: 0,
        filled: 0,
        cancelled: 0,
        totalVolume: 0,
      };
    }
  }
}
