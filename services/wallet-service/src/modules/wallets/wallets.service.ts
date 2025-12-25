import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly dataSource: DataSource,
  ) {}

  async getUserWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepository.find({ where: { userId } });
  }

  async getOrCreateWallet(userId: string, assetId: string): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({ where: { userId, assetId } });
    if (!wallet) {
      wallet = this.walletRepository.create({ userId, assetId });
      wallet = await this.walletRepository.save(wallet);
    }
    return wallet;
  }

  async getBalance(userId: string, assetId: string): Promise<{ available: string; locked: string }> {
    const wallet = await this.getOrCreateWallet(userId, assetId);
    return { available: wallet.availableBalance, locked: wallet.lockedBalance };
  }

  async lockBalance(userId: string, assetId: string, amount: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, { where: { userId, assetId }, lock: { mode: 'pessimistic_write' } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const available = parseFloat(wallet.availableBalance);
      const amountNum = parseFloat(amount);
      if (available < amountNum) throw new BadRequestException('Insufficient balance');

      wallet.availableBalance = (available - amountNum).toFixed(18);
      wallet.lockedBalance = (parseFloat(wallet.lockedBalance) + amountNum).toFixed(18);
      await queryRunner.manager.save(wallet);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async unlockBalance(userId: string, assetId: string, amount: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, { where: { userId, assetId }, lock: { mode: 'pessimistic_write' } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const locked = parseFloat(wallet.lockedBalance);
      const amountNum = parseFloat(amount);
      if (locked < amountNum) throw new BadRequestException('Insufficient locked balance');

      wallet.lockedBalance = (locked - amountNum).toFixed(18);
      wallet.availableBalance = (parseFloat(wallet.availableBalance) + amountNum).toFixed(18);
      await queryRunner.manager.save(wallet);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async credit(userId: string, assetId: string, amount: string): Promise<Wallet> {
    const wallet = await this.getOrCreateWallet(userId, assetId);
    wallet.availableBalance = (parseFloat(wallet.availableBalance) + parseFloat(amount)).toFixed(18);
    return this.walletRepository.save(wallet);
  }

  async debit(userId: string, assetId: string, amount: string): Promise<Wallet> {
    const wallet = await this.getOrCreateWallet(userId, assetId);
    const available = parseFloat(wallet.availableBalance);
    if (available < parseFloat(amount)) throw new BadRequestException('Insufficient balance');
    wallet.availableBalance = (available - parseFloat(amount)).toFixed(18);
    return this.walletRepository.save(wallet);
  }

  async settleTrade(
    buyerId: string,
    sellerId: string,
    baseAsset: string,
    quoteAsset: string,
    quantity: string,
    cost: string,
  ): Promise<void> {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
          // Buyer:
          // 1. Debit Locked Quote (since it was locked on order creation)
          // 2. Credit Available Base
          
          const buyerQuoteWallet = await queryRunner.manager.findOne(Wallet, { where: { userId: buyerId, assetId: quoteAsset }, lock: { mode: 'pessimistic_write' } });
          const buyerBaseWallet = await this.getOrCreateWalletWithRunner(queryRunner, buyerId, baseAsset);
          
          if (buyerQuoteWallet) {
              const locked = parseFloat(buyerQuoteWallet.lockedBalance);
              const costNum = parseFloat(cost);
              // Handle potential precision/rounding issues or partial fills where we locked more.
              // For now assume perfect match or close enough.
              buyerQuoteWallet.lockedBalance = (locked - costNum).toFixed(18);
              await queryRunner.manager.save(buyerQuoteWallet);
          }

          const buyerBase = parseFloat(buyerBaseWallet.availableBalance);
          buyerBaseWallet.availableBalance = (buyerBase + parseFloat(quantity)).toFixed(18);
          await queryRunner.manager.save(buyerBaseWallet);

          // Seller:
          // 1. Debit Locked Base
          // 2. Credit Available Quote
          
          const sellerBaseWallet = await queryRunner.manager.findOne(Wallet, { where: { userId: sellerId, assetId: baseAsset }, lock: { mode: 'pessimistic_write' } });
          const sellerQuoteWallet = await this.getOrCreateWalletWithRunner(queryRunner, sellerId, quoteAsset);

          if (sellerBaseWallet) {
              const locked = parseFloat(sellerBaseWallet.lockedBalance);
              const qtyNum = parseFloat(quantity);
              sellerBaseWallet.lockedBalance = (locked - qtyNum).toFixed(18);
              await queryRunner.manager.save(sellerBaseWallet);
          }
          
          const sellerQuote = parseFloat(sellerQuoteWallet.availableBalance);
          sellerQuoteWallet.availableBalance = (sellerQuote + parseFloat(cost)).toFixed(18);
          await queryRunner.manager.save(sellerQuoteWallet);

          await queryRunner.commitTransaction();
      } catch (err) {
          await queryRunner.rollbackTransaction();
          throw err; // This might cause infinite retry in RabbitMQ if not handled carefuly
      } finally {
          await queryRunner.release();
      }
  }

  private async getOrCreateWalletWithRunner(runner: any, userId: string, assetId: string): Promise<Wallet> {
      let wallet = await runner.manager.findOne(Wallet, { where: { userId, assetId }, lock: { mode: 'pessimistic_write' } });
      if (!wallet) {
          wallet = runner.manager.create(Wallet, { userId, assetId, availableBalance: '0', lockedBalance: '0' });
          wallet = await runner.manager.save(wallet);
      }
      return wallet;
  }
}
