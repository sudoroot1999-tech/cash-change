import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Loan, LoanStatus } from '../entities/loan.entity';
import { CollateralMonitoring } from '../entities/collateral-monitoring.entity';
import BigNumber from 'bignumber.js';
import { RabbitMQService, EXCHANGES, ROUTING_KEYS } from '@packages/messaging';
import { ChainlinkOracleService } from './chainlink-oracle.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CollateralMonitoringService {
  private readonly logger = new Logger(CollateralMonitoringService.name);
  
  private readonly MIN_HEALTH_FACTOR = 1.1;
  private readonly LIQUIDATION_WARNING_THRESHOLD = 1.2;

  constructor(
    @InjectRepository(Loan)
    private loanRepo: Repository<Loan>,
    @InjectRepository(CollateralMonitoring)
    private monitoringRepo: Repository<CollateralMonitoring>,
    private rabbitmq: RabbitMQService,
    private chainlinkOracle: ChainlinkOracleService,
    private configService: ConfigService,
  ) {}

  /**
   * Monitor all active loans
   * Runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async monitorActiveLoans(): Promise<void> {
    this.logger.debug('Monitoring active loans...');

    const activeLoans = await this.loanRepo.find({
      where: { status: LoanStatus.ACTIVE },
    });

    for (const loan of activeLoans) {
      try {
        await this.checkCollateralHealth(loan);
      } catch (error) {
        this.logger.error(
          `Error monitoring loan ${loan.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.debug(`Monitored ${activeLoans.length} active loans`);
  }

  /**
   * Check collateral health for a specific loan
   */
  async checkCollateralHealth(loan: Loan): Promise<CollateralMonitoring> {
    // Get current prices
    const collateralPrice = await this.getAssetPrice(loan.collateralCurrency);
    const borrowedPrice = await this.getAssetPrice(loan.principalCurrency);

    // Calculate values in USD
    const collateralValueUsd = new BigNumber(loan.collateralAmount)
      .multipliedBy(collateralPrice)
      .toFixed(8);

    const borrowedValueUsd = new BigNumber(loan.principalAmount)
      .plus(loan.accruedInterest)
      .multipliedBy(borrowedPrice)
      .toFixed(8);

    // Calculate current LTV
    const currentLtv = new BigNumber(borrowedValueUsd)
      .div(collateralValueUsd)
      .multipliedBy(100)
      .toFixed(4);

    // Calculate health factor
    const liquidationThreshold = new BigNumber(loan.liquidationThreshold);
    const healthFactor = new BigNumber(collateralValueUsd)
      .multipliedBy(liquidationThreshold)
      .div(100)
      .div(borrowedValueUsd)
      .toFixed(4);

    const healthFactorNum = parseFloat(healthFactor);
    const isAtRisk = healthFactorNum < this.LIQUIDATION_WARNING_THRESHOLD;

    // Create monitoring record
    const monitoring = this.monitoringRepo.create({
      loanId: loan.id,
      collateralValueUsd,
      borrowedValueUsd,
      currentLtv,
      healthFactor,
      collateralPriceUsd: collateralPrice.toFixed(8),
      borrowedPriceUsd: borrowedPrice.toFixed(8),
      oracleSource: 'CHAINLINK',
      priceUpdateTimestamp: new Date(),
      isAtRisk,
      liquidationWarningSent: false,
    });

    const saved = await this.monitoringRepo.save(monitoring);

    // Check if liquidation is needed
    if (healthFactorNum < this.MIN_HEALTH_FACTOR) {
      await this.triggerLiquidationAlert(loan, saved);
    } else if (isAtRisk) {
      await this.sendWarningNotification(loan, saved);
    }

    return saved;
  }

  /**
   * Get current asset price from oracle
   * Uses Chainlink price feeds with fallback to mock prices
   */
  private async getAssetPrice(asset: string): Promise<BigNumber> {
    const useChainlink = this.configService.get<string>('CHAINLINK_ENABLED') === 'true';
    const chain = this.getChainForAsset(asset);

    // Try Chainlink first if enabled
    if (useChainlink) {
      try {
        const chainlinkPrice = await this.chainlinkOracle.getPrice(asset, chain);
        this.logger.debug(`Chainlink price for ${asset}: ${chainlinkPrice.toFixed(2)}`);
        return chainlinkPrice;
      } catch (error) {
        this.logger.warn(
          `Chainlink price fetch failed for ${asset}, using fallback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Fallback to mock prices for development/testing
    return this.getMockPrice(asset);
  }

  /**
   * Get mock price for development/fallback
   */
  private getMockPrice(asset: string): BigNumber {
    const mockPrices: Record<string, number> = {
      USDT: 1.0,
      USDC: 1.0,
      DAI: 1.0,
      BTC: 45000,
      ETH: 3000,
      BNB: 500,
      MATIC: 1.5,
      LINK: 15,
    };

    const price = mockPrices[asset] || 100;
    
    // Add some randomness to simulate price movement
    const variance = price * 0.01; // 1% variance
    const randomPrice = price + (Math.random() - 0.5) * variance;

    return new BigNumber(randomPrice);
  }

  /**
   * Determine which blockchain to use for asset
   */
  private getChainForAsset(asset: string): 'ethereum' | 'bsc' | 'polygon' {
    // Map assets to their primary chains
    const chainMap: Record<string, 'ethereum' | 'bsc' | 'polygon'> = {
      ETH: 'ethereum',
      BTC: 'ethereum',
      LINK: 'ethereum',
      USDT: 'ethereum',
      USDC: 'ethereum',
      DAI: 'ethereum',
      BNB: 'bsc',
      MATIC: 'polygon',
    };

    return chainMap[asset.toUpperCase()] || 'ethereum';
  }

  /**
   * Trigger liquidation alert
   */
  private async triggerLiquidationAlert(
    loan: Loan,
    monitoring: CollateralMonitoring,
  ): Promise<void> {
    this.logger.warn(
      `LIQUIDATION ALERT: Loan ${loan.id} health factor ${monitoring.healthFactor} below minimum ${this.MIN_HEALTH_FACTOR}`,
    );

    // Send notification to borrower
    await this.rabbitmq.publish(
      EXCHANGES.NOTIFICATION_EVENTS,
      ROUTING_KEYS.EMAIL_SEND,
      {
        userId: loan.borrowerId,
        template: 'liquidation-alert',
        data: {
          loanId: loan.id,
          healthFactor: monitoring.healthFactor,
          collateralValue: monitoring.collateralValueUsd,
          borrowedValue: monitoring.borrowedValueUsd,
          minimumHealthFactor: this.MIN_HEALTH_FACTOR,
        },
      },
    );

    // Send in-app notification
    await this.rabbitmq.publish(
      EXCHANGES.NOTIFICATION_EVENTS,
      ROUTING_KEYS.IN_APP_NOTIFICATION,
      {
        userId: loan.borrowerId,
        type: 'LIQUIDATION_ALERT',
        priority: 'HIGH',
        title: 'Liquidation Alert',
        message: `Your loan #${loan.id} is at risk of liquidation. Current health factor: ${monitoring.healthFactor}`,
        data: { loanId: loan.id, healthFactor: monitoring.healthFactor },
      },
    );

    // Alert platform admins
    await this.rabbitmq.publish(
      EXCHANGES.NOTIFICATION_EVENTS,
      ROUTING_KEYS.EMAIL_SEND,
      {
        userId: 'admin',
        template: 'admin-liquidation-alert',
        data: {
          loanId: loan.id,
          borrowerId: loan.borrowerId,
          healthFactor: monitoring.healthFactor,
        },
      },
    );

    // Trigger automatic liquidation process
    await this.rabbitmq.publish(
      EXCHANGES.P2P_LENDING_EVENTS,
      'p2p.liquidation.trigger',
      {
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        lenderId: loan.lenderId,
        healthFactor: monitoring.healthFactor,
        collateralValue: monitoring.collateralValueUsd,
        borrowedValue: monitoring.borrowedValueUsd,
        collateralCurrency: loan.collateralCurrency,
        collateralAmount: loan.collateralAmount,
        timestamp: new Date(),
      },
    );

    // Alert potential liquidators
    await this.rabbitmq.publish(
      EXCHANGES.P2P_LENDING_EVENTS,
      'p2p.liquidation.opportunity',
      {
        loanId: loan.id,
        collateralCurrency: loan.collateralCurrency,
        collateralAmount: loan.collateralAmount,
        borrowedCurrency: loan.principalCurrency,
        borrowedAmount: new BigNumber(loan.principalAmount).plus(loan.accruedInterest).toFixed(8),
        discount: '5', // 5% liquidation discount
        healthFactor: monitoring.healthFactor,
      },
    );

    monitoring.liquidationWarningSent = true;
    await this.monitoringRepo.save(monitoring);
  }

  /**
   * Send warning notification to borrower
   */
  private async sendWarningNotification(
    loan: Loan,
    monitoring: CollateralMonitoring,
  ): Promise<void> {
    if (monitoring.liquidationWarningSent) {
      return; // Already warned
    }

    this.logger.warn(
      `WARNING: Loan ${loan.id} health factor ${monitoring.healthFactor} approaching liquidation threshold`,
    );

    // Calculate required collateral to be safe
    const requiredCollateral = this.calculateRequiredCollateral(
      monitoring.borrowedValueUsd,
      monitoring.collateralPriceUsd,
      1.5, // Target health factor
      parseFloat(loan.liquidationThreshold),
    );

    const currentCollateral = parseFloat(loan.collateralAmount);
    const additionalCollateral = new BigNumber(requiredCollateral)
      .minus(currentCollateral)
      .toFixed(8);

    // Send warning email
    await this.rabbitmq.publish(
      EXCHANGES.NOTIFICATION_EVENTS,
      ROUTING_KEYS.EMAIL_SEND,
      {
        userId: loan.borrowerId,
        template: 'collateral-warning',
        data: {
          loanId: loan.id,
          healthFactor: monitoring.healthFactor,
          warningThreshold: this.LIQUIDATION_WARNING_THRESHOLD,
          currentCollateral: loan.collateralAmount,
          recommendedCollateral: requiredCollateral,
          additionalCollateral,
          collateralCurrency: loan.collateralCurrency,
        },
      },
    );

    // Send in-app notification
    await this.rabbitmq.publish(
      EXCHANGES.NOTIFICATION_EVENTS,
      ROUTING_KEYS.IN_APP_NOTIFICATION,
      {
        userId: loan.borrowerId,
        type: 'COLLATERAL_WARNING',
        priority: 'MEDIUM',
        title: 'Collateral Warning',
        message: `Your loan #${loan.id} health factor (${monitoring.healthFactor}) is approaching liquidation threshold. Consider adding ${additionalCollateral} ${loan.collateralCurrency} to avoid liquidation.`,
        data: { 
          loanId: loan.id, 
          healthFactor: monitoring.healthFactor,
          additionalCollateral,
        },
      },
    );

    monitoring.liquidationWarningSent = true;
    await this.monitoringRepo.save(monitoring);
  }

  /**
   * Get collateral monitoring history for a loan
   */
  async getMonitoringHistory(
    loanId: string,
    limit: number = 100,
  ): Promise<CollateralMonitoring[]> {
    return await this.monitoringRepo.find({
      where: { loanId },
      order: { checkedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get latest monitoring record for a loan
   */
  async getLatestMonitoring(loanId: string): Promise<CollateralMonitoring | null> {
    return await this.monitoringRepo.findOne({
      where: { loanId },
      order: { checkedAt: 'DESC' },
    });
  }

  /**
   * Get all at-risk loans
   */
  async getAtRiskLoans(): Promise<Array<{
    loan: Loan;
    monitoring: CollateralMonitoring;
  }>> {
    const atRiskMonitoring = await this.monitoringRepo
      .createQueryBuilder('cm')
      .innerJoinAndSelect('cm.loan', 'loan')
      .where('cm.is_at_risk = :isAtRisk', { isAtRisk: true })
      .andWhere('loan.status = :status', { status: LoanStatus.ACTIVE })
      .orderBy('cm.health_factor', 'ASC')
      .getMany();

    return atRiskMonitoring.map((monitoring) => ({
      loan: monitoring.loan,
      monitoring,
    }));
  }

  /**
   * Calculate required collateral for target health factor
   */
  calculateRequiredCollateral(
    borrowedValueUsd: string,
    collateralPrice: string,
    targetHealthFactor: number = 1.5,
    liquidationThreshold: number = 150,
  ): string {
    const borrowed = new BigNumber(borrowedValueUsd);
    const price = new BigNumber(collateralPrice);
    const threshold = new BigNumber(liquidationThreshold).div(100);

    // Required collateral = (borrowed * targetHealthFactor) / (threshold * price)
    const requiredCollateral = borrowed
      .multipliedBy(targetHealthFactor)
      .div(threshold)
      .div(price);

    return requiredCollateral.toFixed(8);
  }

  /**
   * Estimate time until liquidation (in hours)
   */
  async estimateTimeUntilLiquidation(
    loan: Loan,
    priceChangeRate: number = -0.05, // -5% per day default
  ): Promise<number | null> {
    const latest = await this.getLatestMonitoring(loan.id);
    
    if (!latest) {
      return null;
    }

    const healthFactor = parseFloat(latest.healthFactor);
    
    if (healthFactor >= this.LIQUIDATION_WARNING_THRESHOLD) {
      return null; // Not at risk
    }

    // Calculate how much collateral value needs to drop
    const collateralValue = new BigNumber(latest.collateralValueUsd);
    const borrowedValue = new BigNumber(latest.borrowedValueUsd);
    const threshold = new BigNumber(loan.liquidationThreshold).div(100);

    // Value at liquidation
    const liquidationValue = borrowedValue.div(threshold).multipliedBy(this.MIN_HEALTH_FACTOR);
    
    // Drop needed
    const dropNeeded = collateralValue.minus(liquidationValue);
    const dropPercent = dropNeeded.div(collateralValue).toNumber();

    // Time until liquidation (days)
    if (priceChangeRate >= 0) {
      return null; // Price going up, no liquidation risk
    }

    const daysUntil = Math.abs(dropPercent / priceChangeRate);
    const hoursUntil = daysUntil * 24;

    return hoursUntil;
  }

  /**
   * Get platform-wide collateral statistics
   */
  async getCollateralStatistics(): Promise<{
    totalActiveLoans: number;
    totalCollateralValueUsd: string;
    totalBorrowedValueUsd: string;
    averageHealthFactor: number;
    loansAtRisk: number;
    loansNearLiquidation: number;
  }> {
    const activeLoans = await this.loanRepo.find({
      where: { status: LoanStatus.ACTIVE },
    });

    if (activeLoans.length === 0) {
      return {
        totalActiveLoans: 0,
        totalCollateralValueUsd: '0',
        totalBorrowedValueUsd: '0',
        averageHealthFactor: 0,
        loansAtRisk: 0,
        loansNearLiquidation: 0,
      };
    }

    // Get latest monitoring for each loan
    const monitoringPromises = activeLoans.map((loan) =>
      this.getLatestMonitoring(loan.id),
    );
    const monitoringRecords = await Promise.all(monitoringPromises);

    const validRecords = monitoringRecords.filter((r) => r !== null) as CollateralMonitoring[];

    const totalCollateral = validRecords.reduce(
      (sum, r) => sum.plus(r.collateralValueUsd),
      new BigNumber(0),
    );

    const totalBorrowed = validRecords.reduce(
      (sum, r) => sum.plus(r.borrowedValueUsd),
      new BigNumber(0),
    );

    const avgHealthFactor =
      validRecords.reduce((sum, r) => sum + parseFloat(r.healthFactor), 0) / validRecords.length;

    const loansAtRisk = validRecords.filter((r) => r.isAtRisk).length;
    const loansNearLiquidation = validRecords.filter(
      (r) => parseFloat(r.healthFactor) < this.MIN_HEALTH_FACTOR,
    ).length;

    return {
      totalActiveLoans: activeLoans.length,
      totalCollateralValueUsd: totalCollateral.toFixed(2),
      totalBorrowedValueUsd: totalBorrowed.toFixed(2),
      averageHealthFactor: Math.round(avgHealthFactor * 100) / 100,
      loansAtRisk,
      loansNearLiquidation,
    };
  }
}
