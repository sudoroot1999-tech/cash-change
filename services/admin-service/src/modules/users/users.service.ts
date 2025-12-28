import { Injectable, NotFoundException, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface UserGrpcService {
  findById(data: { id: string }): any;
  findByEmail(data: { email: string }): any;
  updateKycLevel(data: { user_id: string; kyc_level: number }): any;
}

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);
  private readonly userServiceUrl: string;
  private userGrpcService: UserGrpcService;

  constructor(
    @Inject('USER_PACKAGE') private readonly client: ClientGrpc,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.userServiceUrl = this.configService.get('USER_SERVICE_URL', 'http://user-service:3001');
  }

  onModuleInit() {
    this.userGrpcService = this.client.getService<UserGrpcService>('UserService');
  }

  async findAll(query: any) {
    // Use HTTP for listing/filtering as gRPC doesn't have this endpoint
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.userServiceUrl}/api/v1/users`, { params: query }),
      );
      return response.data;
    } catch (error: any) {
      throw new NotFoundException('Failed to fetch users');
    }
  }

  async findById(id: string) {
    // Use gRPC for direct user lookup
    try {
      const user = await this.userGrpcService.findById({ id }).toPromise();
      if (!user) {
        throw new NotFoundException(`User ${id} not found`);
      }
      return user;
    } catch (error: any) {
      this.logger.error(`gRPC error: ${error.message}`);
      // Fallback to HTTP if gRPC fails
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${this.userServiceUrl}/api/v1/users/${id}`),
        );
        return response.data;
      } catch (httpError: any) {
        throw new NotFoundException(`User ${id} not found`);
      }
    }
  }

  async updateUser(id: string, data: any) {
    // Use HTTP for updates as gRPC doesn't have generic update endpoint
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.userServiceUrl}/api/v1/users/${id}`, data),
      );
      return response.data;
    } catch (error: any) {
      throw new NotFoundException(`Failed to update user ${id}`);
    }
  }

  async updateKycLevel(userId: string, kycLevel: number) {
    // Use gRPC for KYC level update
    try {
      const user = await this.userGrpcService
        .updateKycLevel({ user_id: userId, kyc_level: kycLevel })
        .toPromise();
      this.logger.log(`Updated user ${userId} KYC level to ${kycLevel} via gRPC`);
      return user;
    } catch (error: any) {
      this.logger.error(`Failed to update KYC level via gRPC: ${error.message}`);
      throw new NotFoundException(`Failed to update KYC level for user ${userId}`);
    }
  }

  async suspendUser(id: string, reason: string) {
    // Use HTTP for suspend operation
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.userServiceUrl}/api/v1/users/${id}/suspend`, { reason }),
      );
      return response.data;
    } catch (error: any) {
      throw new NotFoundException(`Failed to suspend user ${id}`);
    }
  }

  async activateUser(id: string) {
    // Use HTTP for activate operation
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.userServiceUrl}/api/v1/users/${id}/activate`, {}),
      );
      return response.data;
    } catch (error: any) {
      throw new NotFoundException(`Failed to activate user ${id}`);
    }
  }

  async getUserStats() {
    // Use HTTP for stats endpoint
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.userServiceUrl}/api/v1/users/stats`),
      );
      return response.data;
    } catch (error: any) {
      return {
        total: 0,
        active: 0,
        suspended: 0,
        verified: 0,
      };
    }
  }
}
