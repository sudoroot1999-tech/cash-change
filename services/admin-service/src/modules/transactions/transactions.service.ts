import { Injectable, NotFoundException, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface WalletGrpcService {
  getBalance(data: { user_id: string; asset_id: string }): any;
  lockBalance(data: { user_id: string; asset_id: string; amount: string }): any;
  unlockBalance(data: { user_id: string; asset_id: string; amount: string }): any;
}

@Injectable()
export class TransactionsService implements OnModuleInit {
  private readonly logger = new Logger(TransactionsService.name);
  private readonly walletServiceUrl: string;
  private walletGrpcService: WalletGrpcService;

  constructor(
    @Inject('WALLET_PACKAGE') private readonly client: ClientGrpc,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.walletServiceUrl = this.configService.get('WALLET_SERVICE_URL', 'http://wallet-service:3003');
  }

  onModuleInit() {
    this.walletGrpcService = this.client.getService<WalletGrpcService>('WalletService');
  }

  async findAll(query: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.walletServiceUrl}/api/v1/transactions`, { params: query }),
      );
      return response.data;
    } catch (error: any) {
      throw new NotFoundException('Failed to fetch transactions');
    }
  }

  async findById(id: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.walletServiceUrl}/api/v1/transactions/${id}`),
      );
      return response.data;
    } catch (error: any) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
  }

  async approveWithdrawal(id: string, notes?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.walletServiceUrl}/api/v1/transactions/${id}/approve`, {
          notes,
        }),
      );
      return response.data;
    } catch (error: any) {
      throw new NotFoundException(`Failed to approve withdrawal ${id}`);
    }
  }

  async rejectWithdrawal(id: string, reason: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.walletServiceUrl}/api/v1/transactions/${id}/reject`, {
          reason,
        }),
      );
      return response.data;
    } catch (error: any) {
      throw new NotFoundException(`Failed to reject withdrawal ${id}`);
    }
  }

  async getTransactionStats() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.walletServiceUrl}/api/v1/transactions/stats`),
      );
      return response.data;
    } catch (error: any) {
      return {
        pending: 0,
        approved: 0,
        rejected: 0,
        totalVolume: 0,
      };
    }
  }
}

