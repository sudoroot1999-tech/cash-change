import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface UserGrpcService {
  findById(data: { id: string }): any;
}

interface MarketGrpcService {
  getAllTickers(data: {}): any;
}

@Injectable()
export class DashboardService implements OnModuleInit {
  private readonly logger = new Logger(DashboardService.name);
  private readonly userServiceUrl: string;
  private readonly tradingServiceUrl: string;
  private readonly walletServiceUrl: string;
  private readonly complianceServiceUrl: string;
  private userGrpcService: UserGrpcService;
  private marketGrpcService: MarketGrpcService;

  constructor(
    @Inject('USER_PACKAGE') private readonly userClient: ClientGrpc,
    @Inject('MARKET_PACKAGE') private readonly marketClient: ClientGrpc,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.userServiceUrl = this.configService.get('USER_SERVICE_URL', 'http://user-service:3001');
    this.tradingServiceUrl = this.configService.get(
      'TRADING_SERVICE_URL',
      'http://trading-service:3004',
    );
    this.walletServiceUrl = this.configService.get(
      'WALLET_SERVICE_URL',
      'http://wallet-service:3003',
    );
    this.complianceServiceUrl = this.configService.get(
      'COMPLIANCE_URL',
      'http://compliance-service:3007',
    );
  }

  onModuleInit() {
    this.userGrpcService = this.userClient.getService<UserGrpcService>('UserService');
    this.marketGrpcService = this.marketClient.getService<MarketGrpcService>('MarketService');
  }

  async getOverview() {
    try {
      // Try to get market data via gRPC
      let marketData = null;
      try {
        marketData = await this.marketGrpcService.getAllTickers({}).toPromise();
        this.logger.log('Fetched market data via gRPC');
      } catch (grpcError: any) {
        this.logger.warn(`gRPC market data fetch failed: ${grpcError.message}`);
      }

      const [userStats, orderStats, transactionStats, kycStats] = await Promise.allSettled([
        this.getUserStats(),
        this.getOrderStats(),
        this.getTransactionStats(),
        this.getKycStats(),
      ]);

      return {
        users: userStats.status === 'fulfilled' ? userStats.value : {},
        orders: orderStats.status === 'fulfilled' ? orderStats.value : {},
        transactions: transactionStats.status === 'fulfilled' ? transactionStats.value : {},
        kyc: kycStats.status === 'fulfilled' ? kycStats.value : {},
        market: marketData || null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        users: {},
        orders: {},
        transactions: {},
        kyc: {},
        market: null,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async getUserStats() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.userServiceUrl}/api/v1/users/stats`),
      );
      return response.data;
    } catch {
      return { total: 0, active: 0, suspended: 0, verified: 0 };
    }
  }

  private async getOrderStats() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.tradingServiceUrl}/api/v1/orders/stats`),
      );
      return response.data;
    } catch {
      return { total: 0, pending: 0, filled: 0, cancelled: 0, totalVolume: 0 };
    }
  }

  private async getTransactionStats() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.walletServiceUrl}/api/v1/transactions/stats`),
      );
      return response.data;
    } catch {
      return { pending: 0, approved: 0, rejected: 0, totalVolume: 0 };
    }
  }

  private async getKycStats() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.complianceServiceUrl}/api/v1/kyc/stats`),
      );
      return response.data;
    } catch {
      return { pending: 0, approved: 0, rejected: 0, total: 0 };
    }
  }
}
