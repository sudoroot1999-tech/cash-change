import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { ApiResponse, camelToSnake, KycStatus, User, UserStatus, UserTier } from '@exchange/common';

export interface SnakedUser {
  id: string;
  email: string;
  username: string;
  phone?: string | null;
  status: UserStatus;
  tier: UserTier;
  kyc_level: number;
  kyc_status?: string;
  fee_tier?: string;
  referral_code: string;
  referred_by?: string | null;
  two_factor_enabled: boolean;
  is_two_factor_enabled?: boolean;
  two_factor_secret?: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  email_verification_token?: string | null;
  anti_phishing_code?: string | null;
  last_login_at?: Date | null;
  last_login_ip?: string | null;
  created_at: Date;
  updated_at: Date;
}

@Controller()
export class UsersGrpcController {
  constructor(private readonly usersService: UsersService) { }

  @GrpcMethod('UserService', 'FindById')
  async findById(data: { id: string }): Promise<ApiResponse<SnakedUser>> {
    try {
      const user = await this.usersService.findById(data.id);
      return camelToSnake<ApiResponse<User>>({ success: true, data: user });
    }
    catch (error: any) {
      return { success: false, error }
    }
  }

  @GrpcMethod('UserService', 'VerifyPassword')
  async verifyPassword(data: { user_id: string; password: string }): Promise<ApiResponse<{ is_valid: boolean }>> {
    try {
      const isValid = await this.usersService.verifyPassword(data.user_id, data.password);
      return camelToSnake<ApiResponse<{ isValid: boolean }>>({ success: true, data: { isValid } });
    }
    catch (error: any) {
      return { success: false, error }
    }
  }

  @GrpcMethod('UserService', 'UpdateKycLevel')
  async updateKycLevel(data: { user_id: string; kyc_level: number }): Promise<ApiResponse<SnakedUser>> {
    try {
      const user = await this.usersService.updateKycLevel(data.user_id, data.kyc_level);
      return camelToSnake<ApiResponse<User>>({ success: true, data: user });
    }
    catch (error: any) {
      return { success: false, error }
    }
  }

  @GrpcMethod('UserService', 'Create')
  async create(data: { email: string; password?: string; username?: string; referral_code?: string }): Promise<ApiResponse<SnakedUser>> {
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
  async validate(data: { email: string; password: string }): Promise<ApiResponse<SnakedUser>> {
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
  async resetPassword(data: { token: string; new_password: string }): Promise<ApiResponse<string>> {
    try {
      const response = await this.usersService.resetPassword({
        token: data.token,
        newPassword: data.new_password,
      });
      return camelToSnake<ApiResponse<string>>({ success: true, data: response.message });
    }
    catch (error: any) {
      return { success: false, error }
    }
  }

  @GrpcMethod('UserService', 'ChangePassword')
  async changePassword(data: { user_id: string; current_password: string; new_password: string }): Promise<ApiResponse<string>> {
    try {
      const response = await this.usersService.changePassword(data.user_id, {
        currentPassword: data.current_password,
        newPassword: data.new_password
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
