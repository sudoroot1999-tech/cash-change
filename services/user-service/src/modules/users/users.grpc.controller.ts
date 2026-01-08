import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { ApiResponse, camelToSnake, User } from '@exchange/common';

@Controller()
export class UsersGrpcController {
  constructor(private readonly usersService: UsersService) { }

  @GrpcMethod('UserService', 'FindById')
  async findById(data: { id: string }): Promise<ApiResponse<User>> {
    try {
      const user = await this.usersService.findById(data.id);
      return camelToSnake<ApiResponse<User>>({ success: true, data: user });
    }
    catch (error: any) {
      return { success: false, error }
    }
  }

  @GrpcMethod('UserService', 'VerifyPassword')
  async verifyPassword(data: { user_id: string; password: string }): Promise<ApiResponse<{ isValid: boolean }>> {
    try {
      const isValid = await this.usersService.verifyPassword(data.user_id, data.password);
      return camelToSnake<ApiResponse<{ isValid: boolean }>>({ success: true, data: { isValid } });
    }
    catch (error: any) {
      return { success: false, error }
    }
  }

  @GrpcMethod('UserService', 'UpdateKycLevel')
  async updateKycLevel(data: { user_id: string; kyc_level: number }): Promise<ApiResponse<User>> {
    try {
      const user = await this.usersService.updateKycLevel(data.user_id, data.kyc_level);
      return camelToSnake<ApiResponse<User>>({ success: true, data: user });
    }
    catch (error: any) {
      return { success: false, error }
    }
  }

  @GrpcMethod('UserService', 'Create')
  async create(data: { email: string; password?: string; username?: string; referral_code?: string }): Promise<ApiResponse<User>> {
    try {
      const user = await this.usersService.create({
        email: data.email,
        password: data.password || '', // Password might be hashed or handled by service
        username: data.username,
        referralCode: data.referral_code,
      });
      return camelToSnake<ApiResponse<User>>({ success: true, data: user });
    }
    catch (error: any) {
      return { success: false, error }
    }
  }

  @GrpcMethod('UserService', 'Validate')
  async validate(data: { email: string; password: string }): Promise<ApiResponse<User>> {
    try {
      const user = await this.usersService.validate(data.email, data.password);
      if (!user) return { success: false, data: null };
      return camelToSnake<ApiResponse<User>>({ success: true, data: user });
    }
    catch (error: any) {
      return { success: false, error }
    }
  }

  @GrpcMethod('UserService', 'ResetPassword')
  async resetPassword(data: { token: string; newPassword: string }): Promise<ApiResponse<string>> {
    try {
      const response = await this.usersService.resetPassword({
        token: data.token,
        newPassword: data.newPassword,
      });
      return camelToSnake<ApiResponse<string>>({ success: true, data: response.message });
    }
    catch (error: any) {
      return { success: false, error }
    }
  }

  @GrpcMethod('UserService', 'ChangePassword')
  async changePassword(data: { user_id: string; currentPassword: string; newPassword: string }): Promise<ApiResponse<string>> {
    try {
      const response = await this.usersService.changePassword(data.user_id, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      return camelToSnake<ApiResponse<string>>({ success: true, data: response.message });
    }

    catch (error: any) {
      return { success: false, error }
    }
  }

  @GrpcMethod('UserService', 'ForgotPassword')
  async forgotPassword(data: { email: string }): Promise<ApiResponse<string>> {
    try {
      const response = await this.usersService.forgotPassword(data);
      return camelToSnake<ApiResponse<string>>({ success: true, data: response.message });
    }
    catch (error: any) {
      return { success: false, error }
    }
  }
}
