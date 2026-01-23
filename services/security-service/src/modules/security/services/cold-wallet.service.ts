import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ColdWallet  } from '../entities/cold-wallet.entity';
import Decimal from 'decimal.js';
import { COLD_WALLET_STATUS, COLD_WALLET_TYPES, ColdWalletStatus, ColdWalletType } from '@exchange/common';

export interface CreateColdWalletDto {
  currency: string;
  address: string;
  type: ColdWalletType;
  multiSigConfig?: {
    requiredSignatures: number;
    totalSigners: number;
    signerAddresses: string[];
  };
  location?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ColdWalletService {
  private readonly logger = new Logger(ColdWalletService.name);

  constructor(
    @InjectRepository(ColdWallet)
    private coldWalletRepository: Repository<ColdWallet>,
  ) {}

  /**
   * Create cold wallet
   */
  async createColdWallet(data: CreateColdWalletDto): Promise<ColdWallet> {
    // Validate multi-sig config
    if (data.type === COLD_WALLET_TYPES.MULTI_SIG && !data.multiSigConfig) {
      throw new BadRequestException('Multi-sig configuration required');
    }

    if (data.multiSigConfig) {
      const { requiredSignatures, totalSigners, signerAddresses } = data.multiSigConfig;
      
      if (requiredSignatures > totalSigners) {
        throw new BadRequestException('Required signatures cannot exceed total signers');
      }
      
      if (signerAddresses.length !== totalSigners) {
        throw new BadRequestException('Signer addresses count must match total signers');
      }
    }

    const wallet = this.coldWalletRepository.create({
      ...data,
      status: COLD_WALLET_STATUS.ACTIVE,
      balance: '0',
    });

    await this.coldWalletRepository.save(wallet);
    this.logger.log(`Cold wallet created: ${wallet.address}`);
    
    return wallet;
  }

  /**
   * Get cold wallet by address
   */
  async getColdWallet(address: string): Promise<ColdWallet | null> {
    return await this.coldWalletRepository.findOne({
      where: { address },
    });
  }

  /**
   * Get all cold wallets
   */
  async getAllColdWallets(currency?: string): Promise<ColdWallet[]> {
    const where: any = {};
    if (currency) {
      where.currency = currency;
    }

    return await this.coldWalletRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update cold wallet balance
   */
  async updateBalance(
    address: string,
    balance: string,
  ): Promise<ColdWallet> {
    const wallet = await this.getColdWallet(address);
    
    if (!wallet) {
      throw new BadRequestException('Cold wallet not found');
    }

    wallet.balance = balance;
    return await this.coldWalletRepository.save(wallet);
  }

  /**
   * Update wallet status
   */
  async updateStatus(
    address: string,
    status: ColdWalletStatus,
  ): Promise<ColdWallet> {
    const wallet = await this.getColdWallet(address);
    
    if (!wallet) {
      throw new BadRequestException('Cold wallet not found');
    }

    wallet.status = status;
    return await this.coldWalletRepository.save(wallet);
  }

  /**
   * Record audit
   */
  async recordAudit(address: string): Promise<ColdWallet> {
    const wallet = await this.getColdWallet(address);
    
    if (!wallet) {
      throw new BadRequestException('Cold wallet not found');
    }

    wallet.lastAuditAt = new Date();
    return await this.coldWalletRepository.save(wallet);
  }

  /**
   * Get total cold storage balance
   */
  async getTotalColdStorageBalance(currency: string): Promise<string> {
    const wallets = await this.coldWalletRepository.find({
      where: {
        currency,
        status: COLD_WALLET_STATUS.ACTIVE,
      },
    });

    const total = wallets.reduce(
      (sum, wallet) => sum.plus(new Decimal(wallet.balance)),
      new Decimal(0),
    );

    return total.toString();
  }

  /**
   * Verify multi-sig transaction
   */
  async verifyMultiSigTransaction(
    address: string,
    signatures: string[],
  ): Promise<boolean> {
    const wallet = await this.getColdWallet(address);
    
    if (!wallet || wallet.type !== COLD_WALLET_TYPES.MULTI_SIG) {
      return false;
    }

    if (!wallet.multiSigConfig) {
      return false;
    }

    // Verify we have enough valid signatures
    return signatures.length >= wallet.multiSigConfig.requiredSignatures;
  }

  /**
   * Setup hardware wallet integration
   */
  async setupHardwareWallet(data: {
    currency: string;
    address: string;
    deviceType: 'LEDGER' | 'TREZOR';
    publicKey: string;
  }): Promise<ColdWallet> {
    const wallet = this.coldWalletRepository.create({
      currency: data.currency,
      address: data.address,
      type: COLD_WALLET_TYPES.HARDWARE,
      status: COLD_WALLET_STATUS.ACTIVE,
      balance: '0',
      metadata: {
        deviceType: data.deviceType,
        publicKey: data.publicKey,
      },
    });

    await this.coldWalletRepository.save(wallet);
    this.logger.log(`Hardware wallet setup: ${data.deviceType} - ${wallet.address}`);
    
    return wallet;
  }

  /**
   * Create time-locked transfer
   */
  async createTimeLockedTransfer(data: {
    fromAddress: string;
    toAddress: string;
    amount: string;
    unlockTime: Date;
  }): Promise<any> {
    // This would interact with smart contract or blockchain
    // For now, just log the intention
    
    this.logger.log(`Time-locked transfer created:`, {
      from: data.fromAddress,
      to: data.toAddress,
      amount: data.amount,
      unlockTime: data.unlockTime,
    });

    return {
      status: 'pending',
      unlockTime: data.unlockTime,
    };
  }

  /**
   * Get wallets needing audit
   */
  async getWalletsNeedingAudit(daysThreshold: number = 30): Promise<ColdWallet[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const wallets = await this.coldWalletRepository.find({
      where: {
        status: COLD_WALLET_STATUS.ACTIVE,
      },
    });

    return wallets.filter(wallet => 
      !wallet.lastAuditAt || wallet.lastAuditAt < thresholdDate
    );
  }
}
