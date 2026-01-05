import { Injectable } from '@nestjs/common';
import {
  hash,
  verify,
  Options
} from '@node-rs/argon2';

@Injectable()
export class PasswordService {
  private readonly options:Options = {
    
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  };

  /**
   * Hash password using Argon2id
   */
   async hashPassword(password: string): Promise<string> {
    return hash(password, this.options);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(hashValue: string, password: string): Promise<boolean> {
    try {
      return await verify(hashValue, password);
    } catch {
      return false;
    }
  }
}
