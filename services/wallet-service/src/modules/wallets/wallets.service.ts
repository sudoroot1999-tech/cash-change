import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet, WalletType } from './entities/wallet.entity';
import { HDWalletService } from './services/hd-wallet.service';
import { AddressService } from './services/address.service';
import Decimal from 'decimal.js';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private hdWalletService: HDWalletService,
    private addressService: AddressService,
    private dataSource: DataSource,
  ) { }

  /**
   * Create a new wallet for a user
   */
  async createWallet(
    userId: string,
    currency: string,
    type: WalletType = WalletType.HOT,
  ): Promise<Wallet> {
    // Check if wallet already exists
    const existing = await this.walletRepository.findOne({
      where: { userId, currency },
    });

    if (existing) {
      throw new BadRequestException(
        `Wallet for ${currency} already exists for this user`,
      );
    }

    // Generate master public key for HD wallet
    const mnemonic = process.env.MASTER_MNEMONIC || '';
    const masterPublicKey = await this.hdWalletService.generateMasterPublicKey(
      mnemonic,
      currency,
    );

    // Create wallet
    const wallet = this.walletRepository.create({
      userId,
      currency: currency.toUpperCase(),
      balance: '0',
      lockedBalance: '0',
      type,
      masterPublicKey,
      addressIndex: 0,
      isActive: true,
    });

    const saved = await this.walletRepository.save(wallet);

    // Generate first deposit address
    await this.addressService.generateDepositAddress(saved.id);

    this.logger.log(
      `Created ${type} wallet for user ${userId}, currency ${currency}`,
    );

    return saved;
  }

  /**
   * Get user wallets
   */
  async getUserWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  /**
   * Get user wallet by currency
   */
  async getUserWalletByCurrency(
    userId: string,
    currency: string,
  ): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { userId, currency: currency.toUpperCase(), isActive: true },
    });

    if (!wallet) {
      throw new NotFoundException(
        `Wallet not found for currency ${currency}`,
      );
    }

    return wallet;
  }

  /**
   * Get wallet balance
   */
  async getBalance(walletId: string): Promise<{
    balance: string;
    lockedBalance: string;
    availableBalance: string;
  }> {
    const wallet = await this.getWallet(walletId);

    const balance = new Decimal(wallet.balance);
    const lockedBalance = new Decimal(wallet.lockedBalance);
    const availableBalance = balance.minus(lockedBalance);

    return {
      balance: balance.toString(),
      lockedBalance: lockedBalance.toString(),
      availableBalance: availableBalance.toString(),
    };
  }

  /**
   * Credit wallet (increase balance)
   */
  async creditWallet(
    walletId: string,
    amount: string,
    description: string = 'Credit',
  ): Promise<Wallet> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const currentBalance = new Decimal(wallet.balance);
      const creditAmount = new Decimal(amount);

      if (creditAmount.lessThanOrEqualTo(0)) {
        throw new BadRequestException('Credit amount must be positive');
      }

      wallet.balance = currentBalance.plus(creditAmount).toString();

      const updated = await manager.save(wallet);

      this.logger.log(
        `Credited wallet ${walletId}: ${amount} (${description})`,
      );

      return updated;
    });
  }

  /**
   * Debit wallet (decrease balance)
   */
  async debitWallet(
    walletId: string,
    amount: string,
    description: string = 'Debit',
  ): Promise<Wallet> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const currentBalance = new Decimal(wallet.balance);
      const lockedBalance = new Decimal(wallet.lockedBalance);
      const debitAmount = new Decimal(amount);

      if (debitAmount.lessThanOrEqualTo(0)) {
        throw new BadRequestException('Debit amount must be positive');
      }

      const availableBalance = currentBalance.minus(lockedBalance);

      if (availableBalance.lessThan(debitAmount)) {
        throw new BadRequestException('Insufficient balance');
      }

      wallet.balance = currentBalance.minus(debitAmount).toString();

      const updated = await manager.save(wallet);

      this.logger.log(
        `Debited wallet ${walletId}: ${amount} (${description})`,
      );

      return updated;
    });
  }

  /**
   * Lock balance (for pending operations)
   */
  async lockBalance(walletId: string, amount: string): Promise<Wallet> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const currentBalance = new Decimal(wallet.balance);
      const currentLocked = new Decimal(wallet.lockedBalance);
      const lockAmount = new Decimal(amount);

      if (lockAmount.lessThanOrEqualTo(0)) {
        throw new BadRequestException('Lock amount must be positive');
      }

      const availableBalance = currentBalance.minus(currentLocked);

      if (availableBalance.lessThan(lockAmount)) {
        throw new BadRequestException('Insufficient available balance');
      }

      wallet.lockedBalance = currentLocked.plus(lockAmount).toString();

      const updated = await manager.save(wallet);

      this.logger.log(`Locked balance in wallet ${walletId}: ${amount}`);

      return updated;
    });
  }

  /**
   * Unlock balance
   */
  async unlockBalance(walletId: string, amount: string): Promise<Wallet> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const currentLocked = new Decimal(wallet.lockedBalance);
      const unlockAmount = new Decimal(amount);

      if (unlockAmount.lessThanOrEqualTo(0)) {
        throw new BadRequestException('Unlock amount must be positive');
      }

      if (currentLocked.lessThan(unlockAmount)) {
        throw new BadRequestException('Unlock amount exceeds locked balance');
      }

      wallet.lockedBalance = currentLocked.minus(unlockAmount).toString();

      const updated = await manager.save(wallet);

      this.logger.log(`Unlocked balance in wallet ${walletId}: ${amount}`);

      return updated;
    });
  }

  /**
   * Transfer between wallets (atomic operation)
   */
  async transferBetweenWallets(
    fromWalletId: string,
    toWalletId: string,
    amount: string,
  ): Promise<{ fromWallet: Wallet; toWallet: Wallet }> {
    return this.dataSource.transaction(async (manager) => {
      // Lock both wallets
      const [fromWallet, toWallet] = await Promise.all([
        manager.findOne(Wallet, {
          where: { id: fromWalletId },
          lock: { mode: 'pessimistic_write' },
        }),
        manager.findOne(Wallet, {
          where: { id: toWalletId },
          lock: { mode: 'pessimistic_write' },
        }),
      ]);

      if (!fromWallet || !toWallet) {
        throw new NotFoundException('One or both wallets not found');
      }

      if (fromWallet.currency !== toWallet.currency) {
        throw new BadRequestException('Wallets must have the same currency');
      }

      // Debit from source
      const fromBalance = new Decimal(fromWallet.balance);
      const fromLocked = new Decimal(fromWallet.lockedBalance);
      const transferAmount = new Decimal(amount);

      const fromAvailable = fromBalance.minus(fromLocked);

      if (fromAvailable.lessThan(transferAmount)) {
        throw new BadRequestException('Insufficient balance in source wallet');
      }

      fromWallet.balance = fromBalance.minus(transferAmount).toString();

      // Credit to destination
      const toBalance = new Decimal(toWallet.balance);
      toWallet.balance = toBalance.plus(transferAmount).toString();

      const [updatedFrom, updatedTo] = await Promise.all([
        manager.save(fromWallet),
        manager.save(toWallet),
      ]);

      this.logger.log(
        `Transferred ${amount} from wallet ${fromWalletId} to ${toWalletId}`,
      );

      return { fromWallet: updatedFrom, toWallet: updatedTo };
    });
  }

  /**
   * Get all wallets for a currency (for sweeping, etc.)
   */
  async getWalletsByCurrency(
    currency: string,
    type?: WalletType,
  ): Promise<Wallet[]> {
    const where: any = { currency: currency.toUpperCase(), isActive: true };

    if (type) {
      where.type = type;
    }

    return this.walletRepository.find({ where });
  }

  /**
   * Deactivate wallet
   */
  async deactivateWallet(walletId: string): Promise<void> {
    await this.walletRepository.update(walletId, { isActive: false });
    this.logger.log(`Wallet ${walletId} deactivated`);
  }
}
