import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Loan, LoanStatus, CollateralType } from '../entities/loan.entity';
import { RewardHistory, RewardType, RewardStatus } from '../entities/reward-history.entity';
import { BlockchainService } from './blockchain.service';
import { LENDING_CONTRACT_ABI } from './contract-abis';
import { BorrowDto, RepayDto } from '../dto/lending.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';

@Injectable()
export class LendingService {
  private readonly logger = new Logger(LendingService.name);
  private readonly lendingContractAddress: string;
  private readonly MIN_HEALTH_FACTOR = 1.1;

  constructor(
    @InjectRepository(Loan)
    private loanRepo: Repository<Loan>,
    @InjectRepository(RewardHistory)
    private rewardHistoryRepo: Repository<RewardHistory>,
    private blockchainService: BlockchainService,
    private configService: ConfigService,
  ) {
    this.lendingContractAddress = this.configService.get<string>('LENDING_CONTRACT_ADDRESS', '');
  }

  async borrow(userId: string, borrowDto: BorrowDto): Promise<Loan> {
    const {
      collateralAsset,
      collateralAmount,
      borrowedAsset,
      borrowedAmount,
      collateralType = CollateralType.CRYPTO,
      nftTokenId,
      nftContractAddress,
    } = borrowDto;

    // Calculate collateral value and LTV
    const collateralValueUsd = await this.getAssetPrice(collateralAsset, collateralAmount);
    const borrowValueUsd = await this.getAssetPrice(borrowedAsset, borrowedAmount);
    
    const maxLtvRatio = parseFloat(this.configService.get<string>('MAX_LTV_RATIO', '75'));
    const ltvRatio = (parseFloat(borrowValueUsd) / parseFloat(collateralValueUsd)) * 100;

    if (ltvRatio > maxLtvRatio) {
      throw new BadRequestException(`LTV ratio ${ltvRatio.toFixed(2)}% exceeds maximum ${maxLtvRatio}%`);
    }

    // Interact with smart contract
    const contract = await this.blockchainService.getContract(
      this.lendingContractAddress,
      LENDING_CONTRACT_ABI,
    );

    try {
      let tx;
      
      if (collateralType === CollateralType.NFT) {
        tx = await contract.borrowWithNFTCollateral(
          nftContractAddress,
          nftTokenId,
          borrowedAsset,
          this.blockchainService.parseEther(borrowedAmount),
        );
      } else {
        tx = await contract.borrow(
          collateralAsset,
          this.blockchainService.parseEther(collateralAmount),
          borrowedAsset,
          this.blockchainService.parseEther(borrowedAmount),
        );
      }

      const receipt = await tx.wait();
      this.logger.log(`Borrow transaction confirmed: ${receipt.hash}`);

      // Calculate interest rate (simplified)
      const interestRate = await this.calculateInterestRate(borrowedAsset);
      const healthFactor = await this.calculateHealthFactor(
        collateralValueUsd,
        borrowValueUsd,
        ltvRatio.toString(),
      );

      // Save to database
      const loan = this.loanRepo.create({
        userId,
        collateralAsset,
        collateralAmount,
        collateralValueUsd,
        collateralType,
        nftTokenId,
        nftContractAddress,
        borrowedAsset,
        borrowedAmount,
        accruedInterest: '0',
        interestRate: interestRate.toString(),
        healthFactor: healthFactor.toString(),
        ltvRatio: ltvRatio.toString(),
        liquidationThreshold: this.configService.get<string>('LIQUIDATION_THRESHOLD', '80'),
        status: LoanStatus.ACTIVE,
        loanStartDate: new Date(),
        lastInterestUpdate: new Date(),
        borrowTxHash: receipt.hash,
        contractAddress: this.lendingContractAddress,
      });

      return await this.loanRepo.save(loan);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to borrow: ${err.message}`, err.stack);
      throw new BadRequestException('Failed to create loan');
    }
  }

  async repay(userId: string, repayDto: RepayDto): Promise<Loan> {
    const { loanId, amount } = repayDto;

    const loan = await this.loanRepo.findOne({
      where: { id: loanId, userId, status: LoanStatus.ACTIVE },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    // Update accrued interest
    await this.updateLoanInterest(loan);

    const totalOwed = new BigNumber(loan.borrowedAmount).plus(loan.accruedInterest);
    const repayAmount = new BigNumber(amount);

    if (repayAmount.isGreaterThan(totalOwed)) {
      throw new BadRequestException('Repay amount exceeds total owed');
    }

    // Interact with smart contract
    const contract = await this.blockchainService.getContract(
      this.lendingContractAddress,
      LENDING_CONTRACT_ABI,
    );

    try {
      const tx = await contract.repay(
        0, // loanId in contract
        this.blockchainService.parseEther(amount),
      );

      const receipt = await tx.wait();
      this.logger.log(`Repay transaction confirmed: ${receipt.hash}`);

      // Update loan
      if (repayAmount.isGreaterThanOrEqualTo(totalOwed)) {
        // Full repayment
        loan.status = LoanStatus.REPAID;
        loan.loanEndDate = new Date();
        loan.repayTxHash = receipt.hash;
      } else {
        // Partial repayment
        if (repayAmount.isGreaterThan(loan.accruedInterest)) {
          const principalPaid = repayAmount.minus(loan.accruedInterest);
          loan.borrowedAmount = new BigNumber(loan.borrowedAmount).minus(principalPaid).toString();
          loan.accruedInterest = '0';
        } else {
          loan.accruedInterest = new BigNumber(loan.accruedInterest).minus(repayAmount).toString();
        }

        // Recalculate health factor
        const borrowValueUsd = await this.getAssetPrice(loan.borrowedAsset, loan.borrowedAmount);
        loan.healthFactor = await this.calculateHealthFactor(
          loan.collateralValueUsd,
          borrowValueUsd,
          loan.ltvRatio,
        );
      }

      return await this.loanRepo.save(loan);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to repay: ${err.message}`, err.stack);
      throw new BadRequestException('Failed to repay loan');
    }
  }

  async getLoans(userId: string): Promise<Loan[]> {
    const loans = await this.loanRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // Update interest for active loans
    for (const loan of loans) {
      if (loan.status === LoanStatus.ACTIVE) {
        await this.updateLoanInterest(loan);
      }
    }

    return loans;
  }

  async getLoan(userId: string, loanId: string): Promise<Loan> {
    const loan = await this.loanRepo.findOne({
      where: { id: loanId, userId },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    if (loan.status === LoanStatus.ACTIVE) {
      await this.updateLoanInterest(loan);
      
      // Update health factor
      const borrowValueUsd = await this.getAssetPrice(loan.borrowedAsset, loan.borrowedAmount);
      loan.healthFactor = await this.calculateHealthFactor(
        loan.collateralValueUsd,
        borrowValueUsd,
        loan.ltvRatio,
      );
    }

    return loan;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorHealthFactors(): Promise<void> {
    this.logger.log('Monitoring loan health factors');

    const activeLoans = await this.loanRepo.find({
      where: { status: LoanStatus.ACTIVE },
    });

    for (const loan of activeLoans) {
      await this.updateLoanInterest(loan);

      const borrowValueUsd = await this.getAssetPrice(loan.borrowedAsset, loan.borrowedAmount);
      const healthFactor = parseFloat(
        await this.calculateHealthFactor(loan.collateralValueUsd, borrowValueUsd, loan.ltvRatio),
      );

      loan.healthFactor = healthFactor.toString();

      if (healthFactor < this.MIN_HEALTH_FACTOR) {
        this.logger.warn(`Loan ${loan.id} is at risk. Health factor: ${healthFactor}`);
        // Trigger liquidation alert
        await this.triggerLiquidationAlert(loan);
      }

      await this.loanRepo.save(loan);
    }
  }

  async liquidateLoan(loanId: string, liquidatorUserId: string): Promise<Loan> {
    const loan = await this.loanRepo.findOne({
      where: { id: loanId, status: LoanStatus.ACTIVE },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    const healthFactor = parseFloat(loan.healthFactor);
    if (healthFactor >= this.MIN_HEALTH_FACTOR) {
      throw new BadRequestException('Loan is healthy, cannot liquidate');
    }

    // Interact with smart contract
    const contract = await this.blockchainService.getContract(
      this.lendingContractAddress,
      LENDING_CONTRACT_ABI,
    );

    try {
      const tx = await contract.liquidate(0); // loanId in contract
      const receipt = await tx.wait();
      
      this.logger.log(`Liquidation transaction confirmed: ${receipt.hash}`);

      loan.status = LoanStatus.LIQUIDATED;
      loan.loanEndDate = new Date();
      loan.liquidationTxHash = receipt.hash;

      await this.loanRepo.save(loan);

      // Record liquidation reward for liquidator
      const penalty = new BigNumber(loan.borrowedAmount)
        .multipliedBy(parseFloat(this.configService.get<string>('LIQUIDATION_PENALTY', '10')))
        .dividedBy(100);

      const reward = this.rewardHistoryRepo.create({
        userId: liquidatorUserId,
        rewardType: RewardType.LENDING,
        rewardAsset: loan.borrowedAsset,
        amount: penalty.toString(),
        sourceId: loanId,
        status: RewardStatus.CLAIMED,
        transactionHash: receipt.hash,
        claimedAt: new Date(),
      });
      await this.rewardHistoryRepo.save(reward);

      return loan;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to liquidate: ${err.message}`, err.stack);
      throw new BadRequestException('Failed to liquidate loan');
    }
  }

  private async updateLoanInterest(loan: Loan): Promise<void> {
    const now = Date.now();
    const lastUpdate = loan.lastInterestUpdate.getTime();
    const timeElapsed = (now - lastUpdate) / 1000; // seconds

    const borrowAmount = new BigNumber(loan.borrowedAmount);
    const interestRate = new BigNumber(loan.interestRate).dividedBy(100);
    const secondsPerYear = 31536000;

    const interest = borrowAmount.multipliedBy(interestRate).multipliedBy(timeElapsed).dividedBy(secondsPerYear);
    
    loan.accruedInterest = new BigNumber(loan.accruedInterest).plus(interest).toString();
    loan.lastInterestUpdate = new Date();
  }

  private async calculateInterestRate(_asset: string): Promise<number> {
    // Simplified interest rate calculation
    // In production, this would be based on utilization rate
    const baseRate = 5; // 5% base rate
    const utilizationMultiplier = 2;
    const utilization = 60; // Mock 60% utilization

    return baseRate + (utilization * utilizationMultiplier) / 100;
  }

  private async calculateHealthFactor(
    collateralValueUsd: string,
    borrowValueUsd: string,
    _ltvRatio: string,
  ): Promise<string> {
    const collateralValue = new BigNumber(collateralValueUsd);
    const borrowValue = new BigNumber(borrowValueUsd);
    const liquidationThreshold = new BigNumber(
      this.configService.get<string>('LIQUIDATION_THRESHOLD', '80'),
    ).dividedBy(100);

    if (borrowValue.isZero()) {
      return '999';
    }

    const healthFactor = collateralValue.multipliedBy(liquidationThreshold).dividedBy(borrowValue);
    return healthFactor.toString();
  }

  private async getAssetPrice(asset: string, amount: string): Promise<string> {
    // Mock price oracle - In production, use Chainlink or other oracle
    const prices = {
      BTC: 45000,
      ETH: 3000,
      USDT: 1,
      USDC: 1,
      DAI: 1,
    };

    const price = prices[asset] || 100;
    return new BigNumber(amount).multipliedBy(price).toString();
  }

  private async triggerLiquidationAlert(loan: Loan): Promise<void> {
    // Send alert to monitoring system
    this.logger.warn(`LIQUIDATION ALERT: Loan ${loan.id} for user ${loan.userId}`);
    // In production, this would send notifications, webhooks, etc.
  }
}
