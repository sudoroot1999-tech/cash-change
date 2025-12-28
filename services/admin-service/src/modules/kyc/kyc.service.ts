import { Injectable, NotFoundException, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface UserGrpcService {
  findById(data: { id: string }): any;
  updateKycLevel(data: { user_id: string; kyc_level: number }): any;
}

@Injectable()
export class KycService implements OnModuleInit {
  private readonly logger = new Logger(KycService.name);
  private readonly complianceServiceUrl: string;
  private userGrpcService: UserGrpcService;

  constructor(
    @Inject('USER_PACKAGE') private readonly client: ClientGrpc,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.complianceServiceUrl = this.configService.get('COMPLIANCE_URL', 'http://compliance-service:3007');
  }

  onModuleInit() {
    this.userGrpcService = this.client.getService<UserGrpcService>('UserService');
  }

  async findAll(query: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.complianceServiceUrl}/api/v1/kyc`, { params: query }),
      );
      return response.data;
    } catch (error: any) {
      throw new NotFoundException('Failed to fetch KYC requests');
    }
  }

  async findById(id: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.complianceServiceUrl}/api/v1/kyc/${id}`),
      );
      return response.data;
    } catch (error: any) {
      throw new NotFoundException(`KYC request ${id} not found`);
    }
  }

  async reviewKyc(id: string, decision: 'approved' | 'rejected', notes?: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.complianceServiceUrl}/api/v1/kyc/${id}/review`, {
          decision,
          notes,
        }),
      );
      
      // If approved, update user KYC level via gRPC
      if (decision === 'approved' && response.data?.userId && response.data?.level) {
        try {
          await this.userGrpcService
            .updateKycLevel({
              user_id: response.data.userId,
              kyc_level: response.data.level,
            })
            .toPromise();
          this.logger.log(`Updated user ${response.data.userId} KYC level via gRPC after approval`);
        } catch (grpcError: any) {
          this.logger.error(`Failed to update KYC level via gRPC: ${grpcError.message}`);
          // Don't fail the review if gRPC update fails
        }
      }
      
      return response.data;
    } catch (error: any) {
      throw new NotFoundException(`Failed to review KYC ${id}`);
    }
  }

  async getKycStats() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.complianceServiceUrl}/api/v1/kyc/stats`),
      );
      return response.data;
    } catch (error: any) {
      return {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
      };
    }
  }
}

