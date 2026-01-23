import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepositHistory, DepositStatus } from '../entities/deposit-history.entity';
import { Address, AddressChain } from '../entities/address.entity';
import { WalletService } from '../wallets.service';
import { TransactionService } from './transaction.service';
import { TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { EthereumService } from '../../blockchain/ethereum.service';
import { BitcoinService } from '../../blockchain/bitcoin.service';
import { BSCService } from '../../blockchain/bsc.service';
import { PolygonService } from '../../blockchain/polygon.service';
import { SolanaService } from '../../blockchain/solana.service';
import { AddressService } from './address.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DepositMonitorService {
  private readonly logger = new Logger(DepositMonitorService.name);
  private lastCheckedBlocks: Map<string, number> = new Map();

  constructor(
    @InjectRepository(DepositHistory)
    private depositRepository: Repository<DepositHistory>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
    private walletManagerService: WalletService,
    private transactionService: TransactionService,
    private addressService: AddressService,
    private ethereumService: EthereumService,
    private bitcoinService: BitcoinService,
    private bscService: BSCService,
    private polygonService: PolygonService,
    private solanaService: SolanaService,
    private configService: ConfigService,
  ) {}

  /**
   * Monitor Ethereum deposits
   */
  async monitorEthereumDeposits(): Promise<void> {
    try {
      const addresses = await this.addressRepository.find({
        where: { chain: AddressChain.ETHEREUM, isActive: true },
        relations: ['wallet'],
      });

      for (const address of addresses) {
        const balance = await this.ethereumService.getBalance(address.address);
        
        // Check if there are new transactions
        // In production, use event indexers or webhooks for better performance
        // This is a simplified version
        
        this.logger.debug(
          `Checked Ethereum address ${address.address}, balance: ${balance}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to monitor Ethereum deposits:', error);
    }
  }

  /**
   * Monitor Bitcoin deposits
   */
  async monitorBitcoinDeposits(): Promise<void> {
    try {
      const addresses = await this.addressRepository.find({
        where: { chain: AddressChain.BITCOIN, isActive: true },
        relations: ['wallet'],
      });

      for (const address of addresses) {
        const balance = await this.bitcoinService.getBalance(address.address);
        
        this.logger.debug(
          `Checked Bitcoin address ${address.address}, balance: ${balance}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to monitor Bitcoin deposits:', error);
    }
  }

  /**
   * Monitor BSC deposits
   */
  async monitorBSCDeposits(): Promise<void> {
    try {
      const addresses = await this.addressRepository.find({
        where: { chain: AddressChain.BSC, isActive: true },
        relations: ['wallet'],
      });

      for (const address of addresses) {
        const balance = await this.bscService.getBalance(address.address);
        
        this.logger.debug(
          `Checked BSC address ${address.address}, balance: ${balance}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to monitor BSC deposits:', error);
    }
  }

  /**
   * Monitor Polygon deposits
   */
  async monitorPolygonDeposits(): Promise<void> {
    try {
      const addresses = await this.addressRepository.find({
        where: { chain: AddressChain.POLYGON, isActive: true },
        relations: ['wallet'],
      });

      for (const address of addresses) {
        const balance = await this.polygonService.getBalance(address.address);
        
        this.logger.debug(
          `Checked Polygon address ${address.address}, balance: ${balance}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to monitor Polygon deposits:', error);
    }
  }

  /**
   * Monitor Solana deposits
   */
  async monitorSolanaDeposits(): Promise<void> {
    try {
      const addresses = await this.addressRepository.find({
        where: { chain: AddressChain.SOLANA, isActive: true },
        relations: ['wallet'],
      });

      for (const address of addresses) {
        const balance = await this.solanaService.getBalance(address.address);
        
        this.logger.debug(
          `Checked Solana address ${address.address}, balance: ${balance}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to monitor Solana deposits:', error);
    }
  }

  /**
   * Process detected deposit
   */
  async processDeposit(
    addressId: string,
    txHash: string,
    amount: string,
    fromAddress: string,
    blockNumber: string,
    confirmations: number,
  ): Promise<void> {
    try {
      // Check if deposit already processed
      const existing = await this.depositRepository.findOne({
        where: { txHash },
      });

      if (existing) {
        // Update confirmations
        existing.confirmations = confirmations;
        
        if (
          confirmations >= existing.requiredConfirmations &&
          existing.status === DepositStatus.CONFIRMING
        ) {
          existing.status = DepositStatus.CONFIRMED;
          await this.creditDeposit(existing);
        }

        await this.depositRepository.save(existing);
        return;
      }

      // Get address and wallet info
      const address = await this.addressService.getAddress(addressId);
      const wallet = await this.walletManagerService.getWallet(address.walletId);

      // Create deposit record
      const deposit = this.depositRepository.create({
        userId: wallet.userId,
        walletId: wallet.id,
        addressId: address.id,
        fromAddress,
        toAddress: address.address,
        amount,
        currency: wallet.currency,
        txHash,
        confirmations,
        requiredConfirmations: this.getRequiredConfirmations(wallet.currency),
        status: DepositStatus.DETECTED,
        blockNumber,
      });

      await this.depositRepository.save(deposit);

      // Mark address as used
      await this.addressService.markAsUsed(addressId);

      this.logger.log(
        `Deposit detected: ${amount} ${wallet.currency} to ${address.address}`,
      );

      // If enough confirmations, credit immediately
      if (confirmations >= deposit.requiredConfirmations) {
        deposit.status = DepositStatus.CONFIRMED;
        await this.creditDeposit(deposit);
      } else {
        deposit.status = DepositStatus.CONFIRMING;
      }

      await this.depositRepository.save(deposit);
    } catch (error) {
      this.logger.error(`Failed to process deposit ${txHash}:`, error);
    }
  }

  /**
   * Credit deposit to user wallet
   */
  private async creditDeposit(deposit: DepositHistory): Promise<void> {
    if (deposit.status === DepositStatus.CREDITED) {
      return; // Already credited
    }

    try {
      // Credit wallet
      await this.walletManagerService.creditWallet(
        deposit.walletId,
        deposit.amount,
        `Deposit: ${deposit.txHash}`,
      );

      // Create transaction record
      await this.transactionService.createTransaction({
        userId: deposit.userId,
        walletId: deposit.walletId,
        type: TransactionType.DEPOSIT,
        amount: deposit.amount,
        fee: '0',
        currency: deposit.currency,
        status: TransactionStatus.COMPLETED,
        fromAddress: deposit.fromAddress,
        toAddress: deposit.toAddress,
        txHash: deposit.txHash,
        description: 'Deposit',
      });

      // Update deposit status
      deposit.status = DepositStatus.CREDITED;
      deposit.creditedAt = new Date();
      await this.depositRepository.save(deposit);

      this.logger.log(
        `Credited deposit: ${deposit.amount} ${deposit.currency} to wallet ${deposit.walletId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to credit deposit ${deposit.id}:`, error);
      deposit.status = DepositStatus.FAILED;
      await this.depositRepository.save(deposit);
    }
  }

  /**
   * Update confirmations for pending deposits
   */
  async updateDepositConfirmations(): Promise<void> {
    try {
      const pendingDeposits = await this.depositRepository.find({
        where: {
          status: DepositStatus.CONFIRMING,
        },
      });

      for (const deposit of pendingDeposits) {
        let confirmations = 0;

        switch (deposit.currency) {
          case 'ETH':
            const ethTx = await this.ethereumService.getTransaction(deposit.txHash);
            if (ethTx) confirmations = ethTx.confirmations;
            break;
          case 'BTC':
            const btcTx = await this.bitcoinService.getTransaction(deposit.txHash);
            if (btcTx) confirmations = btcTx.confirmations;
            break;
          // Add other chains...
        }

        deposit.confirmations = confirmations;

        if (confirmations >= deposit.requiredConfirmations) {
          deposit.status = DepositStatus.CONFIRMED;
          await this.creditDeposit(deposit);
        }

        await this.depositRepository.save(deposit);
      }
    } catch (error) {
      this.logger.error('Failed to update deposit confirmations:', error);
    }
  }

  /**
   * Get required confirmations by currency
   */
  private getRequiredConfirmations(currency: string): number {
    const defaults: Record<string, number> = {
      BTC: 6,
      ETH: 12,
      BSC: 15,
      MATIC: 128,
      SOL: 1,
    };

    return defaults[currency.toUpperCase()] || 6;
  }

  /**
   * Get deposit history for user
   */
  async getUserDepositHistory(
    userId: string,
    currency?: string,
  ): Promise<DepositHistory[]> {
    const where: any = { userId };
    
    if (currency) {
      where.currency = currency.toUpperCase();
    }

    return this.depositRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
