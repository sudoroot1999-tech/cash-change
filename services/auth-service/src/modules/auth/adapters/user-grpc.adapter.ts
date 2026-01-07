import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { UserPort } from "../ports/user.port";
import { ClientGrpc } from "@nestjs/microservices";
import { Observable, firstValueFrom } from 'rxjs';
import { NotFoundError, snakeToCamel, UnauthorizedError, User } from "@exchange/common";


interface UserGrpcService {
  findById(data: { id: string }): Observable<User>;
  create(data: {
    email: string;
    password: string;
    username: string;
    referral_code?: string;
  }): Observable<User>;
  validate(data: { email: string; password: string }): Observable<User | null>;
  verifyPassword(data: { user_id: string; password: string }): Observable<{success:boolean}>;
  changePassword(data: {
    user_id: string;
    currentPassword: string;
    newPassword: string;
  }): Observable<{message:string,success:boolean}>;
  forgotPassword(data: { email: string }): Observable<{message:string,success:boolean}>;
  resetPassword(data: { token: string; newPassword: string }): Observable<{message:string,success:boolean}>;
}


@Injectable()
export class UserGrpcAdapter implements UserPort, OnModuleInit {
  private service: UserGrpcService;

  constructor(@Inject('USER_PACKAGE') private client: ClientGrpc) { }

  onModuleInit() {
    this.service = this.client.getService<UserGrpcService>('UserService');
  }

  async create({ email, password, username, referral_code }: { email: string; password: string; username: string; referral_code?: string; }): Promise<User> {
    const data = { email, password, username,referral_code }
    try {
      const grpcUser = await firstValueFrom(this.service.create(data));
      return snakeToCamel(grpcUser);
    }
    catch (error) {
      throw new Error("user already exist");
    }
  }

  async validate(email: string, password: string): Promise<User> {
    try {
      const grpcUser = await firstValueFrom(this.service.validate({ email, password }));
      if (!grpcUser) throw new UnauthorizedError('Invalid email or password');

      const user = snakeToCamel(grpcUser);
      if (user.status !== 'active' && user.status !== 'pending') {
        throw new UnauthorizedError('Account is suspended or banned');
      }
      return user;
    } catch (error) {
      // If RPC returns null or error, return null
      throw new UnauthorizedError('An error happened');;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const grpcUser = await firstValueFrom(this.service.findById({ id }));
      if (!grpcUser) throw new NotFoundError('Invalid email or password');
      return snakeToCamel(grpcUser);
    } catch {
      throw new NotFoundError('Invalid email or password');
    }
  }

  async verifyPassword({ user_id, password }: { user_id: string; password: string; }) {
    try {
      const isPasswordValid = await firstValueFrom(this.service.verifyPassword({
        user_id,
        password
      }));
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid password');
      }
      return snakeToCamel(isPasswordValid)
    }
    catch (error) { throw new UnauthorizedError('Invalid password'); }
  }

  async resetPassword({ token, newPassword }: { token: string; newPassword: string; }) {
    try {
      const response = await firstValueFrom(this.service.resetPassword({
        token,
        newPassword
      }));
      if (!response) {
        throw new UnauthorizedError('Something Wrong');
      }
      return snakeToCamel(response)
    }
    catch (error) { throw new UnauthorizedError('Something Wrong'); }
  }

  async forgotPassword(email: string) {
    try {
      const response = await firstValueFrom(this.service.forgotPassword({
        email
      }));
      if (!response) {
        throw new UnauthorizedError('Something Wrong');
      }
      return snakeToCamel(response)
    }
    catch (error) { throw new UnauthorizedError('Something Wrong'); }
  }

  async changePassword({ user_id, currentPassword, newPassword }: { user_id: string; currentPassword: string; newPassword: string; }) {
    try {
      const response = await firstValueFrom(this.service.changePassword({
        user_id,
        currentPassword,
        newPassword,
      }));
      return snakeToCamel(response)
    }
    catch (error) { throw new Error('Something Wrong') }
  }
}
