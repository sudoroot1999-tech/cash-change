import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  RabbitMQService,
  QUEUES,
  TradeExecutedEvent,
  BalanceUpdatedEvent,
} from '@exchange/common';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import Decimal from 'decimal.js';

/**
 * Consumer for trading events
 * Handles balance updates from executed trades
 */
@Injectable()
export class TradingConsumer implements OnModuleInit {
  private readonly logger = new Logger(TradingConsumer.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly rabbitmq: RabbitMQService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // Subscribe to balance update events
    await this.rabbitmq.subscribe<BalanceUpdatedEvent>(
      QUEUES.BALANCE_UPDATE,
      async (event) => {
        await this.handleBalanceUpdate(event);
      },
    );

    // Subscribe to trade executed events
    await this.rabbitmq.subscribe<TradeExecutedEvent>(
      QUEUES.TRADE_EXECUTE,
      async (event) => {
        await this.handleTradeExecuted(event);
      },
    );

    this.logger.log('✅ Trading consumers started');
  }

  /**
   * Handle balance update event
   */
  private async handleBalanceUpdate(event: BalanceUpdatedEvent): Promise<void> {
    try {
      this.logger.log(
        `Received BalanceUpdatedEvent for user ${event.userId}, asset ${event.asset}`,
      );

      const wallet = await this.walletRepository.findOne({
        where: { userId: event.userId, currency: event.asset },
      });

      if (!wallet) {
        this.logger.warn(
          `Wallet not found for user ${event.userId}, asset ${event.asset}`,
        );
        return;
      }

      // Update wallet balances
      wallet.balance = event.balance;
      wallet.lockedBalance = event.locked;
      wallet.updatedAt = new Date();

      await this.walletRepository.save(wallet);

      this.logger.log(
        `Wallet updated for user ${event.userId}: ${event.asset} balance=${event.balance}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling BalanceUpdatedEvent: ${(error as Error).message}`,
      );
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Handle trade executed event
   * Updates balances for both buyer and seller
   */
  private async handleTradeExecuted(event: TradeExecutedEvent): Promise<void> {
    try {
      this.logger.log(`Received TradeExecutedEvent: ${event.tradeId}`);

      // Use transaction to ensure atomicity
      await this.dataSource.transaction(async (manager) => {
        // Parse trading pair (e.g., "BTC/USDT" -> base: BTC, quote: USDT)
        const [baseCurrency, quoteCurrency] = event.pair.split('/');

        // Update buyer balances
        await this.updateBuyerBalances(
          manager,
          event.buyUserId,
          baseCurrency,
          quoteCurrency,
          event.quantity,
          event.price,
          event.buyerFee,
          event.tradeId,
        );

        // Update seller balances
        await this.updateSellerBalances(
          manager,
          event.sellUserId,
          baseCurrency,
          quoteCurrency,
          event.quantity,
          event.price,
          event.sellerFee,
          event.tradeId,
        );
      });

      this.logger.log(`Trade ${event.tradeId} balances updated successfully`);
    } catch (error) {
      this.logger.error(
        `Error handling TradeExecutedEvent: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Update buyer balances
   * Buyer receives base currency, pays quote currency + fee
   */
  private async updateBuyerBalances(
    manager: any,
    userId: string,
    baseCurrency: string,
    quoteCurrency: string,
    quantity: string,
    price: string,
    fee: string,
    tradeId: string,
  ): Promise<void> {
    const quantityDecimal = new Decimal(quantity);
    const priceDecimal = new Decimal(price);
    const feeDecimal = new Decimal(fee);
    const totalCost = quantityDecimal.times(priceDecimal).plus(feeDecimal);

    // Increase base currency (what buyer receives)
    const baseWallet = await manager.findOne(Wallet, {
      where: { userId, currency: baseCurrency },
    });

    if (baseWallet) {
      baseWallet.balance = new Decimal(baseWallet.balance)
        .plus(quantityDecimal)
        .toString();
      baseWallet.available = new Decimal(baseWallet.available)
        .plus(quantityDecimal)
        .toString();
      baseWallet.updatedAt = new Date();
      await manager.save(baseWallet);

      // Record transaction
      await this.recordTransaction(
        manager,
        userId,
        baseCurrency,
        quantityDecimal.toString(),
        'TRADE_BUY',
        tradeId,
      );
    }

    // Decrease quote currency + fee (what buyer pays)
    const quoteWallet = await manager.findOne(Wallet, {
      where: { userId, currency: quoteCurrency },
    });

    if (quoteWallet) {
      quoteWallet.balance = new Decimal(quoteWallet.balance)
        .minus(totalCost)
        .toString();
      quoteWallet.locked = new Decimal(quoteWallet.locked)
        .minus(totalCost)
        .toString();
      quoteWallet.available = new Decimal(quoteWallet.available).toString();
      quoteWallet.updatedAt = new Date();
      await manager.save(quoteWallet);

      // Record transaction
      await this.recordTransaction(
        manager,
        userId,
        quoteCurrency,
        `-${totalCost.toString()}`,
        'TRADE_BUY',
        tradeId,
      );
    }

    this.logger.debug(
      `Buyer ${userId}: +${quantity} ${baseCurrency}, -${totalCost} ${quoteCurrency}`,
    );
  }

  /**
   * Update seller balances
   * Seller receives quote currency - fee, pays base currency
   */
  private async updateSellerBalances(
    manager: any,
    userId: string,
    baseCurrency: string,
    quoteCurrency: string,
    quantity: string,
    price: string,
    fee: string,
    tradeId: string,
  ): Promise<void> {
    const quantityDecimal = new Decimal(quantity);
    const priceDecimal = new Decimal(price);
    const feeDecimal = new Decimal(fee);
    const totalReceived = quantityDecimal.times(priceDecimal).minus(feeDecimal);

    // Decrease base currency (what seller sells)
    const baseWallet = await manager.findOne(Wallet, {
      where: { userId, currency: baseCurrency },
    });

    if (baseWallet) {
      baseWallet.balance = new Decimal(baseWallet.balance)
        .minus(quantityDecimal)
        .toString();
      baseWallet.locked = new Decimal(baseWallet.locked)
        .minus(quantityDecimal)
        .toString();
      baseWallet.available = new Decimal(baseWallet.available).toString();
      baseWallet.updatedAt = new Date();
      await manager.save(baseWallet);

      // Record transaction
      await this.recordTransaction(
        manager,
        userId,
        baseCurrency,
        `-${quantityDecimal.toString()}`,
        'TRADE_SELL',
        tradeId,
      );
    }

    // Increase quote currency - fee (what seller receives)
    const quoteWallet = await manager.findOne(Wallet, {
      where: { userId, currency: quoteCurrency },
    });

    if (quoteWallet) {
      quoteWallet.balance = new Decimal(quoteWallet.balance)
        .plus(totalReceived)
        .toString();
      quoteWallet.available = new Decimal(quoteWallet.available)
        .plus(totalReceived)
        .toString();
      quoteWallet.updatedAt = new Date();
      await manager.save(quoteWallet);

      // Record transaction
      await this.recordTransaction(
        manager,
        userId,
        quoteCurrency,
        totalReceived.toString(),
        'TRADE_SELL',
        tradeId,
      );
    }

    this.logger.debug(
      `Seller ${userId}: -${quantity} ${baseCurrency}, +${totalReceived} ${quoteCurrency}`,
    );
  }

  /**
   * Record transaction for audit trail
   */
  private async recordTransaction(
    manager: any,
    userId: string,
    currency: string,
    amount: string,
    type: string,
    referenceId: string,
  ): Promise<void> {
    const transaction = manager.create(Transaction, {
      userId,
      currency,
      amount,
      type,
      status: 'COMPLETED',
      referenceId,
      createdAt: new Date(),
    });

    await manager.save(transaction);
  }
}
