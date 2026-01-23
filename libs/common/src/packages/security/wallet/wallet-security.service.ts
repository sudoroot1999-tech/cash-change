import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Redis from 'ioredis';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  currency: string;
  amount: string;
  address: string;
  network?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approvals: string[];
  requiredApprovals: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface AddressValidation {
  isValid: boolean;
  network?: string;
  type?: string;
  error?: string;
}

@Injectable()
export class WalletSecurityService {
  private readonly logger = new Logger(WalletSecurityService.name);
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis(configService.get('REDIS_URL'), {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }

  /**
   * Validate cryptocurrency address
   */
  validateAddress(address: string, currency: string, network?: string): AddressValidation {
    try {
      switch (currency.toUpperCase()) {
        case 'BTC':
          return this.validateBitcoinAddress(address, network);
        case 'ETH':
        case 'USDT':
        case 'USDC':
          return this.validateEthereumAddress(address);
        case 'SOL':
          return this.validateSolanaAddress(address);
        default:
          return { isValid: false, error: 'Unsupported currency' };
      }
    } catch (error: any) {
      this.logger.error(`Address validation failed: ${error.message}`);
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Validate Bitcoin address
   */
  private validateBitcoinAddress(address: string, network?: string): AddressValidation {
    // Legacy address (P2PKH)
    const legacyRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
    // SegWit address (P2WPKH/P2WSH)
    const segwitRegex = /^bc1[a-z0-9]{39,59}$/;
    // Testnet
    const testnetRegex = /^[mn2][a-km-zA-HJ-NP-Z1-9]{25,34}$|^tb1[a-z0-9]{39,59}$/;

    if (network === 'testnet' && testnetRegex.test(address)) {
      return { isValid: true, network: 'testnet', type: 'bitcoin' };
    }

    if (legacyRegex.test(address)) {
      return { isValid: true, network: 'mainnet', type: 'bitcoin-legacy' };
    }

    if (segwitRegex.test(address)) {
      return { isValid: true, network: 'mainnet', type: 'bitcoin-segwit' };
    }

    return { isValid: false, error: 'Invalid Bitcoin address format' };
  }

  /**
   * Validate Ethereum address
   */
  private validateEthereumAddress(address: string): AddressValidation {
    const regex = /^0x[a-fA-F0-9]{40}$/;

    if (!regex.test(address)) {
      return { isValid: false, error: 'Invalid Ethereum address format' };
    }

    // Check EIP-55 checksum if mixed case
    if (address !== address.toLowerCase() && address !== address.toUpperCase()) {
      const isValidChecksum = this.verifyEthereumChecksum(address);
      if (!isValidChecksum) {
        return { isValid: false, error: 'Invalid address checksum' };
      }
    }

    return { isValid: true, network: 'ethereum', type: 'ethereum' };
  }

  /**
   * Validate Solana address
   */
  private validateSolanaAddress(address: string): AddressValidation {
    const regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

    if (!regex.test(address)) {
      return { isValid: false, error: 'Invalid Solana address format' };
    }

    return { isValid: true, network: 'solana', type: 'solana' };
  }

  /**
   * Verify Ethereum address checksum (EIP-55)
   */
  private verifyEthereumChecksum(address: string): boolean {
    const addr = address.slice(2);
    const hash = crypto.createHash('sha3-256').update(addr.toLowerCase()).digest('hex');

    for (let i = 0; i < 40; i++) {
      const hashChar = parseInt(hash[i], 16);
      if (
        (hashChar > 7 && addr[i].toUpperCase() !== addr[i]) ||
        (hashChar <= 7 && addr[i].toLowerCase() !== addr[i])
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if address is in blacklist
   */
  async isAddressBlacklisted(address: string): Promise<boolean> {
    const blacklisted = await this.redis.sismember('blacklisted_addresses', address.toLowerCase());
    return blacklisted === 1;
  }

  /**
   * Add address to blacklist
   */
  async blacklistAddress(address: string, reason: string): Promise<void> {
    await this.redis.sadd('blacklisted_addresses', address.toLowerCase());
    await this.redis.set(
      `blacklist_reason:${address.toLowerCase()}`,
      reason,
      'EX',
      365 * 24 * 60 * 60,
    );
    this.logger.warn(`Blacklisted address ${address}: ${reason}`);
  }

  /**
   * Create multi-signature withdrawal request
   */
  async createWithdrawalRequest(
    userId: string,
    currency: string,
    amount: string,
    address: string,
    requiredApprovals: number = 2,
    network?: string,
  ): Promise<WithdrawalRequest> {
    // Validate address
    const validation = this.validateAddress(address, currency, network);
    if (!validation.isValid) {
      throw new Error(`Invalid address: ${validation.error}`);
    }

    // Check blacklist
    const isBlacklisted = await this.isAddressBlacklisted(address);
    if (isBlacklisted) {
      throw new Error('Address is blacklisted');
    }

    const id = crypto.randomBytes(16).toString('hex');
    const request: WithdrawalRequest = {
      id,
      userId,
      currency,
      amount,
      address,
      network,
      status: 'pending',
      approvals: [],
      requiredApprovals,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    await this.redis.set(
      `withdrawal_request:${id}`,
      JSON.stringify(request),
      'EX',
      24 * 60 * 60,
    );

    await this.redis.sadd('pending_withdrawals', id);

    this.logger.log(`Created withdrawal request ${id} for user ${userId}`);

    return request;
  }

  /**
   * Approve withdrawal request
   */
  async approveWithdrawal(requestId: string, approverId: string): Promise<WithdrawalRequest> {
    const data = await this.redis.get(`withdrawal_request:${requestId}`);
    if (!data) {
      throw new Error('Withdrawal request not found or expired');
    }

    const request: WithdrawalRequest = JSON.parse(data);

    if (request.status !== 'pending') {
      throw new Error('Withdrawal request is not pending');
    }

    if (request.approvals.includes(approverId)) {
      throw new Error('Already approved by this approver');
    }

    request.approvals.push(approverId);

    if (request.approvals.length >= request.requiredApprovals) {
      request.status = 'approved';
      await this.redis.srem('pending_withdrawals', requestId);
      this.logger.log(`Withdrawal request ${requestId} approved`);
    }

    await this.redis.set(`withdrawal_request:${requestId}`, JSON.stringify(request));

    return request;
  }

  /**
   * Reject withdrawal request
   */
  async rejectWithdrawal(requestId: string, rejectorId: string, reason: string): Promise<void> {
    const data = await this.redis.get(`withdrawal_request:${requestId}`);
    if (!data) {
      throw new Error('Withdrawal request not found or expired');
    }

    const request: WithdrawalRequest = JSON.parse(data);
    request.status = 'rejected';

    await this.redis.set(`withdrawal_request:${requestId}`, JSON.stringify(request));
    await this.redis.srem('pending_withdrawals', requestId);

    this.logger.warn(`Withdrawal request ${requestId} rejected by ${rejectorId}: ${reason}`);
  }

  /**
   * Get pending withdrawal requests
   */
  async getPendingWithdrawals(): Promise<WithdrawalRequest[]> {
    const ids = await this.redis.smembers('pending_withdrawals');
    const requests: WithdrawalRequest[] = [];

    for (const id of ids) {
      const data = await this.redis.get(`withdrawal_request:${id}`);
      if (data) {
        requests.push(JSON.parse(data));
      }
    }

    return requests;
  }

  /**
   * Generate cold wallet address
   */
  generateColdWalletAddress(currency: string): string {
    // This is a placeholder - in production, use proper HD wallet generation
    // and store the address in secure cold storage
    const randomBytes = crypto.randomBytes(20);

    switch (currency.toUpperCase()) {
      case 'BTC':
        return `bc1${randomBytes.toString('hex')}`;
      case 'ETH':
        return `0x${randomBytes.toString('hex')}`;
      case 'SOL':
        return randomBytes.toString('base64').slice(0, 44);
      default:
        throw new Error('Unsupported currency');
    }
  }

  /**
   * Check if amount exceeds hot wallet threshold
   */
  async shouldUseColdWallet(currency: string, amount: string): Promise<boolean> {
    const threshold = await this.redis.get(`hot_wallet_threshold:${currency}`);
    if (!threshold) {
      return false;
    }

    return parseFloat(amount) > parseFloat(threshold);
  }

  /**
   * Set hot wallet threshold
   */
  async setHotWalletThreshold(currency: string, threshold: string): Promise<void> {
    await this.redis.set(`hot_wallet_threshold:${currency}`, threshold);
    this.logger.log(`Set hot wallet threshold for ${currency}: ${threshold}`);
  }
}
