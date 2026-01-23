import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { WalletService } from './wallets.service';

@Controller()
export class WalletsGrpcController {
  constructor(private readonly walletsService: WalletService) {}

  @GrpcMethod('WalletService', 'GetBalance')
  async getBalance(data: { user_id: string; asset_id: string }) {
    const balance = await this.walletsService.getBalance(data.user_id, data.asset_id);
    return {
      available: balance.available,
      locked: balance.locked,
    };
  }

  @GrpcMethod('WalletService', 'LockBalance')
  async lockBalance(data: { user_id: string; asset_id: string; amount: string }) {
    try {
      await this.walletsService.lockBalance(data.user_id, data.asset_id, data.amount);
      return { success: true, message: 'Balance locked successfully' };
    } catch (error) {
      return { success: false, message: (error as any).message };
    }
  }

  @GrpcMethod('WalletService', 'UnlockBalance')
  async unlockBalance(data: { user_id: string; asset_id: string; amount: string }) {
    try {
      await this.walletsService.unlockBalance(data.user_id, data.asset_id, data.amount);
      return { success: true, message: 'Balance unlocked successfully' };
    } catch (error) {
      return { success: false, message: (error as any).message };
    }
  }
}
