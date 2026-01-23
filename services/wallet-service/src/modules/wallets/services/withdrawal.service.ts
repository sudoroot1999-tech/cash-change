import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  WithdrawalRequest,
  WithdrawalStatus,
  WithdrawalRiskLevel,
} from '../entities/withdrawal-request.entity';
import { WithdrawalLimit } from '../entities/withdrawal-limit.entity';
import { WithdrawalWhitelist } from '../entities/withdrawal-whitelist.entity';
import { WalletService } from '../wallets.service';
import { TransactionService } from './transaction.service';
import { SecurityService } from './security.service';
import { TransactionType, TransactionStatus } from '../entities/transaction.entity';
import { EthereumService } from '../../blockchain/ethereum.service';
import { BitcoinService } from '../../blockchain/bitcoin.service';
import { BSCService } from '../../blockchain/bsc.service';
import { PolygonService } from '../../blockchain/polygon.service';
import { SolanaService } from '../../blockchain/solana.service';
import { ConfigService } from '@nestjs/config';
import { Keypair } from '@solana/web3.js';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    @InjectRepository(WithdrawalRequest)
    private withdrawalRepository: Repository<WithdrawalRequest>,
    @InjectRepository(WithdrawalLimit)
    private limitRepository: Repository<WithdrawalLimit>,
    @InjectRepository(WithdrawalWhitelist)
    private whitelistRepository: Repository<WithdrawalWhitelist>,
    private walletManagerService: WalletService,
    private transactionService: TransactionService,
    private securityService: SecurityService,
    private ethereumService: EthereumService,
    private bitcoinService: BitcoinService,
    private bscService: BSCService,
    private polygonService: PolygonService,
    private solanaService: SolanaService,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  /**
   * Get hot wallet address for a currency
   */
  private getHotWalletAddress(currency: string): string {
    const addresses: Record<string, string> = {
      'BTC': this.configService.get<string>('HOT_WALLET_BTC_ADDRESS') || '',
      'ETH': this.configService.get<string>('HOT_WALLET_ETH_ADDRESS') || '',
      'BNB': this.configService.get<string>('HOT_WALLET_BNB_ADDRESS') || '',
      'BSC': this.configService.get<string>('HOT_WALLET_BSC_ADDRESS') || '',
      'MATIC': this.configService.get<string>('HOT_WALLET_MATIC_ADDRESS') || '',
      'POLYGON': this.configService.get<string>('HOT_WALLET_POLYGON_ADDRESS') || '',
      'SOL': this.configService.get<string>('HOT_WALLET_SOL_ADDRESS') || '',
    };
    return addresses[currency.toUpperCase()] || '';
  }

  /**
   * Estimate transaction fee for a currency
   */
  private async estimateTransactionFee(currency: string, amount: string): Promise<string> {
    try {
      switch (currency.toUpperCase()) {
        case 'ETH':
          // Ethereum gas estimation
          const ethGasPrice = await this.ethereumService.getGasPrice();
          const ethGasLimit = 21000; // Standard transfer
          return (parseFloat(ethGasPrice) * ethGasLimit / 1e18).toFixed(8);

        case 'BTC':
          // Bitcoin fee estimation (simplified)
          return '0.0001'; // ~10 sat/byte for standard tx

        case 'BNB':
        case 'BSC':
          // BSC has lower fees than Ethereum
          const bscGasPrice = await this.bscService.getGasPrice();
          const bscGasLimit = 21000;
          return (parseFloat(bscGasPrice) * bscGasLimit / 1e18).toFixed(8);

        case 'MATIC':
        case 'POLYGON':
          // Polygon has very low fees
          const maticGasPrice = await this.polygonService.getGasPrice();
          const maticGasLimit = 21000;
          return (parseFloat(maticGasPrice) * maticGasLimit / 1e18).toFixed(8);

        case 'SOL':
          // Solana has fixed low fees
          return await this.solanaService.estimateFee().then(fee => fee.toFixed(8));

        default:
          return '0';
      }
    } catch (error) {
      this.logger.error(`Failed to estimate fee for ${currency}:`, error);
      return '0';
    }
  }

  /**
   * Request a withdrawal
   */
  async requestWithdrawal(data: {
    userId: string;
    currency: string;
    amount: string;
    toAddress: string;
    twoFactorCode?: string;
    idempotencyKey?: string;
  }): Promise<WithdrawalRequest> {
    const { userId, currency, amount, toAddress, twoFactorCode, idempotencyKey } =
      data;

    // Check idempotency
    if (idempotencyKey) {
      const existing = await this.withdrawalRepository.findOne({
        where: { userId, notes: idempotencyKey },
      });

      if (existing) {
        return existing;
      }
    }

    // Get user wallet
    const wallet = await this.walletManagerService.getUserWalletByCurrency(
      userId,
      currency,
    );

    // Validate amount
    const withdrawalAmount = new Decimal(amount);
    if (withdrawalAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Withdrawal amount must be positive');
    }

    // Check balance
    const balance = await this.walletManagerService.getBalance(wallet.id);
    if (new Decimal(balance.availableBalance).lessThan(withdrawalAmount)) {
      throw new BadRequestException('Insufficient balance');
    }

    // Validate address
    const isValidAddress = await this.validateAddress(toAddress, currency);
    if (!isValidAddress) {
      throw new BadRequestException('Invalid withdrawal address');
    }

    // Check withdrawal limits
    await this.checkWithdrawalLimits(userId, currency, amount);

    // Check if address is whitelisted
    const isWhitelisted = await this.isAddressWhitelisted(
      userId,
      toAddress,
      currency,
    );

    // Perform risk assessment
    const riskAssessment = await this.securityService.assessWithdrawalRisk({
      userId,
      amount,
      currency,
      toAddress,
      isWhitelisted,
    });

    // Determine if approval is needed
    const needsApproval =
      riskAssessment.riskLevel === WithdrawalRiskLevel.HIGH ||
      riskAssessment.riskLevel === WithdrawalRiskLevel.CRITICAL ||
      new Decimal(amount).greaterThan(50000);

    const requiredApprovals = needsApproval ? 2 : 1;

    // Check if time lock is needed
    const timeLockUntil = this.calculateTimeLock(amount, riskAssessment.riskLevel);

    return this.dataSource.transaction(async (manager) => {
      // Lock the balance
      await this.walletManagerService.lockBalance(wallet.id, amount);

      // Create withdrawal request
      const withdrawal = manager.create(WithdrawalRequest, {
        userId,
        walletId: wallet.id,
        amount,
        currency: currency.toUpperCase(),
        toAddress,
        status: timeLockUntil
          ? WithdrawalStatus.PENDING
          : needsApproval
          ? WithdrawalStatus.PENDING_APPROVAL
          : WithdrawalStatus.APPROVED,
        requiredApprovals,
        currentApprovals: 0,
        riskLevel: riskAssessment.riskLevel,
        riskScore: riskAssessment.score.toString(),
        riskFactors: riskAssessment.factors,
        isWhitelisted,
        timeLockUntil,
        twoFactorVerified: !!twoFactorCode,
        notes: idempotencyKey || '',
      });

      const saved = await manager.save(withdrawal);

      this.logger.log(
        `Withdrawal request created: ${saved.id} (${amount} ${currency})`,
      );

      // If no approval needed and no time lock, process immediately
      if (!needsApproval && !timeLockUntil) {
        await this.processWithdrawal(saved.id);
      }

      return saved;
    });
  }

  /**
   * Approve withdrawal request
   */
  async approveWithdrawal(
    withdrawalId: string,
    approverId: string,
    comment?: string,
  ): Promise<WithdrawalRequest> {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Withdrawal is not pending approval');
    }

    // Check if approver already approved
    const alreadyApproved = withdrawal.approvals.some(
      (a) => a.userId === approverId,
    );

    if (alreadyApproved) {
      throw new BadRequestException('You have already approved this withdrawal');
    }

    // Add approval
    withdrawal.approvals.push({
      userId: approverId,
      timestamp: new Date(),
      comment,
    });

    withdrawal.currentApprovals += 1;

    // If enough approvals, mark as approved
    if (withdrawal.currentApprovals >= withdrawal.requiredApprovals) {
      withdrawal.status = WithdrawalStatus.APPROVED;

      // Process if no time lock
      if (!withdrawal.timeLockUntil || withdrawal.timeLockUntil < new Date()) {
        await this.processWithdrawal(withdrawal.id);
      }
    }

    const updated = await this.withdrawalRepository.save(withdrawal);

    this.logger.log(`Withdrawal ${withdrawalId} approved by ${approverId}`);

    return updated;
  }

  /**
   * Reject withdrawal request
   */
  async rejectWithdrawal(
    withdrawalId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<WithdrawalRequest> {
    return this.dataSource.transaction(async (manager) => {
      const withdrawal = await manager.findOne(WithdrawalRequest, {
        where: { id: withdrawalId },
      });

      if (!withdrawal) {
        throw new NotFoundException('Withdrawal request not found');
      }

      if (
        ![
          WithdrawalStatus.PENDING,
          WithdrawalStatus.PENDING_APPROVAL,
        ].includes(withdrawal.status)
      ) {
        throw new BadRequestException('Cannot reject this withdrawal');
      }

      // Unlock the balance
      await this.walletManagerService.unlockBalance(
        withdrawal.walletId,
        withdrawal.amount,
      );

      // Update withdrawal status
      withdrawal.status = WithdrawalStatus.REJECTED;
      withdrawal.rejectionReason = reason;

      const updated = await manager.save(withdrawal);

      this.logger.log(`Withdrawal ${withdrawalId} rejected by ${rejectedBy}`);

      return updated;
    });
  }

  /**
   * Process withdrawal (send to blockchain)
   */
  async processWithdrawal(withdrawalId: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const withdrawal = await manager.findOne(WithdrawalRequest, {
        where: { id: withdrawalId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!withdrawal) {
        throw new NotFoundException('Withdrawal request not found');
      }

      if (withdrawal.status === WithdrawalStatus.PROCESSING) {
        return; // Already processing
      }

      if (withdrawal.status !== WithdrawalStatus.APPROVED) {
        throw new BadRequestException('Withdrawal is not approved');
      }

      // Check time lock
      if (withdrawal.timeLockUntil && withdrawal.timeLockUntil > new Date()) {
        throw new BadRequestException('Withdrawal is time-locked');
      }

      withdrawal.status = WithdrawalStatus.PROCESSING;
      await manager.save(withdrawal);

      try {
        // Send transaction to blockchain
        let txHash: string;

        // Get private key (from HSM/KMS in production)
        const privateKey = this.configService.get<string>('HOT_WALLET_PRIVATE_KEY') || '';
        const fromAddress = this.getHotWalletAddress(withdrawal.currency);

        // Estimate fee before processing
        const estimatedFee = await this.estimateTransactionFee(
          withdrawal.currency,
          withdrawal.amount,
        );

        switch (withdrawal.currency.toUpperCase()) {
          case 'ETH':
            txHash = await this.ethereumService.sendTransaction(
              privateKey,
              withdrawal.toAddress,
              withdrawal.amount,
            );
            break;

          case 'BTC':
            if (!fromAddress) {
              throw new Error('Bitcoin hot wallet address not configured');
            }
            txHash = await this.bitcoinService.sendTransaction(
              fromAddress,
              privateKey,
              withdrawal.toAddress,
              parseFloat(withdrawal.amount),
            );
            break;

          case 'BNB':
          case 'BSC':
            txHash = await this.bscService.sendTransaction(
              privateKey,
              withdrawal.toAddress,
              withdrawal.amount,
            );
            break;

          case 'MATIC':
          case 'POLYGON':
            txHash = await this.polygonService.sendTransaction(
              privateKey,
              withdrawal.toAddress,
              withdrawal.amount,
            );
            break;

          case 'SOL':
            // Convert base58 private key to Uint8Array for Solana
            try {
              // Assuming private key is stored as base58 string or byte array
              const solPrivateKey = this.configService.get<string>('HOT_WALLET_SOL_PRIVATE_KEY');
              if (!solPrivateKey) {
                throw new Error('Solana hot wallet private key not configured');
              }
              
              // If stored as JSON array of bytes
              const privateKeyBytes = JSON.parse(solPrivateKey) as number[];
              const keypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyBytes));
              
              txHash = await this.solanaService.sendTransaction(
                keypair.secretKey,
                withdrawal.toAddress,
                parseFloat(withdrawal.amount),
              );
            } catch (error) {
              this.logger.error('Failed to process Solana withdrawal:', error);
              throw new Error('Solana withdrawal failed: Invalid private key format');
            }
            break;

          default:
            throw new BadRequestException(
              `Unsupported currency: ${withdrawal.currency}`,
            );
        }

        // Debit wallet and unlock
        await this.walletManagerService.unlockBalance(
          withdrawal.walletId,
          withdrawal.amount,
        );
        await this.walletManagerService.debitWallet(
          withdrawal.walletId,
          withdrawal.amount,
          `Withdrawal: ${txHash}`,
        );

        // Create transaction record with estimated fee
        const transaction = await this.transactionService.createTransaction({
          userId: withdrawal.userId,
          walletId: withdrawal.walletId,
          type: TransactionType.WITHDRAWAL,
          amount: withdrawal.amount,
          fee: estimatedFee,
          currency: withdrawal.currency,
          status: TransactionStatus.PENDING,
          toAddress: withdrawal.toAddress,
          txHash,
          description: 'Withdrawal',
        });

        // Update withdrawal
        withdrawal.status = WithdrawalStatus.COMPLETED;
        withdrawal.transactionId = transaction.id;
        withdrawal.processedAt = new Date();
        await manager.save(withdrawal);

        this.logger.log(
          `Withdrawal ${withdrawalId} processed: ${txHash}`,
        );
      } catch (error) {
        this.logger.error(`Failed to process withdrawal ${withdrawalId}:`, error);

        withdrawal.status = WithdrawalStatus.FAILED;
        withdrawal.rejectionReason = (error as Error).message;
        await manager.save(withdrawal);

        // Unlock balance on failure
        await this.walletManagerService.unlockBalance(
          withdrawal.walletId,
          withdrawal.amount,
        );

        throw error;
      }
    });
  }

  /**
   * Check withdrawal limits
   */
  private async checkWithdrawalLimits(
    userId: string,
    currency: string,
    amount: string,
  ): Promise<void> {
    let limit = await this.limitRepository.findOne({
      where: { userId, currency: currency.toUpperCase() },
    });

    if (!limit) {
      // Create default limit based on KYC level (assume level 1)
      limit = this.limitRepository.create({
        userId,
        currency: currency.toUpperCase(),
        dailyLimit: '1000',
        monthlyLimit: '10000',
        dailyUsed: '0',
        monthlyUsed: '0',
        kycLevel: 1,
      });
      await this.limitRepository.save(limit);
    }

    // Check daily limit
    const newDailyUsed = new Decimal(limit.dailyUsed).plus(amount);
    if (newDailyUsed.greaterThan(limit.dailyLimit)) {
      throw new BadRequestException('Daily withdrawal limit exceeded');
    }

    // Check monthly limit
    const newMonthlyUsed = new Decimal(limit.monthlyUsed).plus(amount);
    if (newMonthlyUsed.greaterThan(limit.monthlyLimit)) {
      throw new BadRequestException('Monthly withdrawal limit exceeded');
    }

    // Update used amounts
    limit.dailyUsed = newDailyUsed.toString();
    limit.monthlyUsed = newMonthlyUsed.toString();
    await this.limitRepository.save(limit);
  }

  /**
   * Check if address is whitelisted
   */
  private async isAddressWhitelisted(
    userId: string,
    address: string,
    currency: string,
  ): Promise<boolean> {
    const whitelist = await this.whitelistRepository.findOne({
      where: {
        userId,
        address,
        currency: currency.toUpperCase(),
        isActive: true,
      },
    });

    return !!whitelist;
  }

  /**
   * Validate withdrawal address
   */
  private async validateAddress(
    address: string,
    currency: string,
  ): Promise<boolean> {
    switch (currency.toUpperCase()) {
      case 'ETH':
        return this.ethereumService.isValidAddress(address);
      case 'BTC':
        return this.bitcoinService.isValidAddress(address);
      case 'BNB':
      case 'BSC':
        return this.bscService.isValidAddress(address);
      case 'MATIC':
      case 'POLYGON':
        return this.polygonService.isValidAddress(address);
      case 'SOL':
        return this.solanaService.isValidAddress(address);
      default:
        return false;
    }
  }

  /**
   * Calculate time lock duration
   */
  private calculateTimeLock(
    amount: string,
    riskLevel: WithdrawalRiskLevel,
  ): Date | null {
    const amountNum = parseFloat(amount);

    // Large amounts or high risk get time-locked
    if (amountNum > 50000 || riskLevel === WithdrawalRiskLevel.CRITICAL) {
      const lockDate = new Date();
      lockDate.setHours(lockDate.getHours() + 24); // 24 hour lock
      return lockDate;
    }

    if (amountNum > 10000 || riskLevel === WithdrawalRiskLevel.HIGH) {
      const lockDate = new Date();
      lockDate.setHours(lockDate.getHours() + 1); // 1 hour lock
      return lockDate;
    }

    return null;
  }

  /**
   * Get user withdrawal requests
   */
  async getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
    return this.withdrawalRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * Get pending withdrawal requests (for admin)
   */
  async getPendingWithdrawals(): Promise<WithdrawalRequest[]> {
    return this.withdrawalRepository.find({
      where: {
        status: WithdrawalStatus.PENDING_APPROVAL,
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Add address to whitelist
   */
  async addToWhitelist(
    userId: string,
    address: string,
    currency: string,
    label?: string,
  ): Promise<WithdrawalWhitelist> {
    // Check if already exists
    const existing = await this.whitelistRepository.findOne({
      where: { userId, address, currency: currency.toUpperCase() },
    });

    if (existing) {
      existing.isActive = true;
      return this.whitelistRepository.save(existing);
    }

    // Validate address
    const isValid = await this.validateAddress(address, currency);
    if (!isValid) {
      throw new BadRequestException('Invalid address');
    }

    const whitelist = this.whitelistRepository.create({
      userId,
      address,
      currency: currency.toUpperCase(),
      label,
      isActive: true,
      verifiedAt: new Date(),
    });

    const saved = await this.whitelistRepository.save(whitelist);

    this.logger.log(`Address ${address} added to whitelist for user ${userId}`);

    return saved;
  }

  /**
   * Get user withdrawal limits
   */
  async getUserLimits(userId: string, currency: string): Promise<{
    dailyLimit: string;
    dailyUsed: string;
    dailyRemaining: string;
    monthlyLimit: string;
    monthlyUsed: string;
    monthlyRemaining: string;
  }> {
    let limit = await this.limitRepository.findOne({
      where: { userId, currency: currency.toUpperCase() },
    });

    if (!limit) {
      // Return default limits
      return {
        dailyLimit: '1000',
        dailyUsed: '0',
        dailyRemaining: '1000',
        monthlyLimit: '10000',
        monthlyUsed: '0',
        monthlyRemaining: '10000',
      };
    }

    const dailyRemaining = new Decimal(limit.dailyLimit)
      .minus(limit.dailyUsed)
      .toString();
    const monthlyRemaining = new Decimal(limit.monthlyLimit)
      .minus(limit.monthlyUsed)
      .toString();

    return {
      dailyLimit: limit.dailyLimit,
      dailyUsed: limit.dailyUsed,
      dailyRemaining,
      monthlyLimit: limit.monthlyLimit,
      monthlyUsed: limit.monthlyUsed,
      monthlyRemaining,
    };
  }
}
