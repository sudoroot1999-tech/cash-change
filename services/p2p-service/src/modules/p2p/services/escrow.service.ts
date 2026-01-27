import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface EscrowLockResult {
  escrowAddress: string;
  txHash: string;
}

interface EscrowReleaseResult {
  txHash: string;
}

@Injectable()
export class EscrowService {
  private readonly walletServiceUrl: string;

  constructor(private configService: ConfigService) {
    this.walletServiceUrl = this.configService.get('WALLET_SERVICE_URL') || 'http://localhost:3008';
  }

  async lockInEscrow(userId: string, asset: string, amount: number): Promise<EscrowLockResult> {
    try {
      // Call wallet service to lock crypto in escrow
      const response = await axios.post(`${this.walletServiceUrl}/api/escrow/lock`, {
        userId,
        asset,
        amount,
        purpose: 'p2p_trade',
      });

      return {
        escrowAddress: response.data.escrowAddress,
        txHash: response.data.txHash,
      };
    } catch (error) {
      console.error('Failed to lock in escrow:', error);
      throw new BadRequestException('Failed to lock crypto in escrow');
    }
  }

  async releaseFromEscrow(
    escrowAddress: string,
    recipientUserId: string,
    asset: string,
    amount: number,
  ): Promise<EscrowReleaseResult> {
    try {
      // Call wallet service to release crypto from escrow
      const response = await axios.post(`${this.walletServiceUrl}/api/escrow/release`, {
        escrowAddress,
        recipientUserId,
        asset,
        amount,
      });

      return {
        txHash: response.data.txHash,
      };
    } catch (error) {
      console.error('Failed to release from escrow:', error);
      throw new BadRequestException('Failed to release crypto from escrow');
    }
  }

  async refundFromEscrow(
    escrowAddress: string,
    recipientUserId: string,
    asset: string,
    amount: number,
  ): Promise<EscrowReleaseResult> {
    try {
      // Call wallet service to refund crypto from escrow
      const response = await axios.post(`${this.walletServiceUrl}/api/escrow/refund`, {
        escrowAddress,
        recipientUserId,
        asset,
        amount,
      });

      return {
        txHash: response.data.txHash,
      };
    } catch (error) {
      console.error('Failed to refund from escrow:', error);
      throw new BadRequestException('Failed to refund crypto from escrow');
    }
  }

  async getEscrowBalance(escrowAddress: string, asset: string): Promise<number> {
    try {
      const response = await axios.get(
        `${this.walletServiceUrl}/api/escrow/${escrowAddress}/balance/${asset}`,
      );

      return response.data.balance;
    } catch (error) {
      console.error('Failed to get escrow balance:', error);
      return 0;
    }
  }
}
