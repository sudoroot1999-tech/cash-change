import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Controller()
export class UsersGrpcController {
  constructor(private readonly usersService: UsersService) {}

  @GrpcMethod('UserService', 'FindById')
  async findById(data: { id: string }) {
    const user = await this.usersService.findById(data.id);
    return this.mapUserToResponse(user);
  }

  @GrpcMethod('UserService', 'FindByEmail')
  async findByEmail(data: { email: string }) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) return null;
    return this.mapUserToResponse(user);
  }

  @GrpcMethod('UserService', 'UpdateKycLevel')
  async updateKycLevel(data: { user_id: string; kyc_level: number }) {
    const user = await this.usersService.updateKycLevel(data.user_id, data.kyc_level);
    return this.mapUserToResponse(user);
  }

  @GrpcMethod('UserService', 'Create')
  async create(data: { email: string; password?: string; referral_code?: string }) {
    const user = await this.usersService.create({
      email: data.email,
      password: data.password || '', // Password might be hashed or handled by service
      referralCode: data.referral_code,
    });
    return this.mapUserToResponse(user);
  }

  private mapUserToResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      tier: user.tier,
      kyc_level: user.kycLevel,
      two_factor_enabled: user.twoFactorEnabled,
      password_hash: user.passwordHash,
    };
  }
}
