import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { camelToSnake } from '@exchange/common';

@Controller()
export class UsersGrpcController {
  constructor(private readonly usersService: UsersService) { }

  @GrpcMethod('UserService', 'FindById')
  async findById(data: { id: string }) {
    const user = await this.usersService.findById(data.id);
    return camelToSnake(this.mapUserToResponse(user));
  }

  @GrpcMethod('UserService', 'VerifyPassword')
  async verifyPassword(data: { user_id: string; password: string }) {
    const isValid = await this.usersService.verifyPassword(data.user_id, data.password);
    if (!isValid) return null;
    return camelToSnake({ success: isValid });
  }

  @GrpcMethod('UserService', 'UpdateKycLevel')
  async updateKycLevel(data: { user_id: string; kyc_level: number }) {
    const user = await this.usersService.updateKycLevel(data.user_id, data.kyc_level);
    return camelToSnake(this.mapUserToResponse(user));
  }

  @GrpcMethod('UserService', 'Create')
  async create(data: { email: string; password?: string; username?: string; referral_code?: string }) {
    const user = await this.usersService.create({
      email: data.email,
      password: data.password || '', // Password might be hashed or handled by service
      username: data.username,
      referralCode: data.referral_code,
    });
    return camelToSnake(this.mapUserToResponse(user));
  }

  @GrpcMethod('UserService', 'Validate')
  async validate(data: { email: string; password: string }) {
    const user = await this.usersService.validate(data.email, data.password);
    if (!user) return null;
    return camelToSnake(this.mapUserToResponse(user));
  }

  @GrpcMethod('UserService', 'ResetPassword')
  async resetPassword(data: { token: string; newPassword: string }) {
    const response = await this.usersService.resetPassword({
      token: data.token,
      newPassword: data.newPassword,
    });
    return camelToSnake(response);
  }

  @GrpcMethod('UserService', 'ChangePassword')
  async changePassword(data: { user_id: string; currentPassword: string; newPassword: string }) {
    const response = await this.usersService.changePassword(data.user_id, {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    });
    return camelToSnake(response);
  }

  @GrpcMethod('UserService', 'ForgotPassword')
  async forgotPassword(data: { email: string }) {
    const response = await this.usersService.forgotPassword(data);
    return camelToSnake(response);
  }

  private mapUserToResponse(user: User) {
    const { passwordHash, ...others } = user
    return {
      ...others
    };
  }
}
