import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { UserPort } from "../ports/user.port";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, firstValueFrom } from 'rxjs';
import { NotFoundError, snakeToCamel, UnauthorizedError, User, UserStatus, UserTier } from "@exchange/common";


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


interface UserGrpcService {
  findById(data: { id: string }): Observable<{ success: boolean, data: SnakedUser }>;
  create(data: {
    email: string;
    password: string;
    username: string;
    referral_code?: string;
  }): Observable<{ success: boolean, data: SnakedUser }>;
  validate(data: { email: string; password: string }): Observable<{ success: boolean, data: SnakedUser }>;
  verifyPassword(data: { user_id: string; password: string }): Observable<{ success: boolean, data: { is_valid: boolean } }>;
  changePassword(data: {
    user_id: string;
    current_password: string;
    new_password: string;
  }): Observable<{ data: string, success: boolean }>;
  forgotPassword(data: { email: string }): Observable<{ data: string, success: boolean }>;
  resetPassword(data: { token: string; new_password: string }): Observable<{ data: string, success: boolean }>;
}


@Injectable()
export class UserGrpcAdapter implements UserPort, OnModuleInit {
  private service: UserGrpcService;

  constructor(@Inject('USER_PACKAGE') private client: ClientGrpc) { }

  onModuleInit() {
    this.service = this.client.getService<UserGrpcService>('UserService');
  }

  async create({ email, password, username, referralCode }: { email: string; password: string; username: string; referralCode?: string; }): Promise<User> {
    const data = { email, password, username, referral_code: referralCode };
    try {
      const response = await firstValueFrom(this.service.create(data));
      if (!response.success || !response.data) {
        throw new Error('Create session failed');
      }
      return snakeToCamel<SnakedUser>(response?.data);
    }
    catch (error) {
      throw new Error("user already exist");
    }
  }

  async validate(email: string, password: string): Promise<User> {
    try {
      const response = await firstValueFrom(this.service.validate({ email, password }));
      if (!response.success || !response.data) {
        throw new Error('Create session failed');
      }
      return snakeToCamel<SnakedUser>(response?.data);
    } catch (error) {
      // If RPC returns null or error, return null
      throw new UnauthorizedError('An error happened');;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const response = await firstValueFrom(this.service.findById({ id }));
      if (!response.success || !response.data) {
        throw new Error('Create session failed');
      }
      return snakeToCamel<SnakedUser>(response?.data);
    } catch {
      throw new NotFoundError('Invalid email or password');
    }
  }

  async verifyPassword({ userId, password }: { userId: string; password: string; }): Promise<{ isValid: boolean }> {
    try {
      const response = await firstValueFrom(this.service.verifyPassword({
        user_id: userId,
        password
      }));
      if (!response.success || !response.data) {
        throw new Error('verify password failed');
      }
      return snakeToCamel(response?.data);
    }
    catch (error) { throw new UnauthorizedError('Invalid password'); }
  }

  async resetPassword({ token, newPassword }: { token: string; newPassword: string; }): Promise<string> {
    try {
      const response = await firstValueFrom(this.service.resetPassword({
        token,
        new_password: newPassword
      }));
      if (!response.success || !response.data) {
        throw new Error('Reset password failed');
      }
      return response?.data
    }
    catch (error) { throw new UnauthorizedError('Something Wrong'); }
  }

  async forgotPassword(email: string): Promise<string> {
    try {
      const response = await firstValueFrom(this.service.forgotPassword({
        email
      }));
      if (!response.success || !response.data) {
        throw new Error('Forget Password failed');
      }
      return response?.data
    }
    catch (error) { throw new UnauthorizedError('Something Wrong'); }
  }

  async changePassword({ userId, currentPassword, newPassword }: { userId: string; currentPassword: string; newPassword: string; }): Promise<string> {
    try {
      const response = await firstValueFrom(this.service.changePassword({
        user_id: userId,
        current_password: currentPassword,
        new_password: newPassword,
      }));
      if (!response.success || !response.data) {
        throw new Error('Create session failed');
      }
      return response?.data
    }
    catch (error) { throw new Error('Something Wrong') }
  }
}
