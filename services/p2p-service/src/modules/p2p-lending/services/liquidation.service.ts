import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan, LoanStatus } from '../entities/loan.entity';
import { CollateralMonitoring } from '../entities/collateral-monitoring.entity';
import { RabbitMQService, EXCHANGES, ROUTING_KEYS } from '@packages/messaging';
import BigNumber from 'bignumber.js';

export interface LiquidationResult {
  loanId: string;
  liquidated: boolean;
  collateralSeized: string;
  debtCovered: string;
  liquidationDiscount: string;
  timestamp: Date;
}

@Injectable()
export class LiquidationService {
  private readonly logger = new Logger(LiquidationService.name);
  
  private readonly LIQUIDATION_DISCOUNT = 0.05; // 5% discount for liquidators
  private readonly LIQUIDATION_PENALTY = 0.1; // 10% penalty to borrower

  constructor(
    @InjectRepository(Loan)
    private loanRepo: Repository<Loan>,
    @InjectRepository(CollateralMonitoring)
    private monitoringRepo: Repository<CollateralMonitoring>,
    private rabbitmq: RabbitMQService,
  ) {}

  /**
   * Execute liquidation for a loan
   */
  async executeLiquidation(loanId: string, liquidatorId?: string): Promise<LiquidationResult> {
    const loan = await this.loanRepo.findOne({ where: { id: loanId } });
    
    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new Error('Loan is not active');
    }

    // Get latest monitoring data
    const monitoring = await this.monitoringRepo.findOne({
      where: { loanId },
      order: { checkedAt: 'DESC' },
    });

    if (!monitoring) {
      throw new Error('No monitoring data found');
    }

    const healthFactor = parseFloat(monitoring.healthFactor);
    const MIN_HEALTH_FACTOR = 1.1;

    if (healthFactor >= MIN_HEALTH_FACTOR) {
      throw new Error(`Loan health factor (${healthFactor}) is above liquidation threshold`);
    }

    this.logger.log(`Starting liquidation for loan ${loanId}`);

    // Calculate liquidation amounts
    const totalDebt = new BigNumber(loan.principalAmount).plus(loan.accruedInterest);
    const collateralValue = new BigNumber(monitoring.collateralValueUsd);
    const borrowedValue = new BigNumber(monitoring.borrowedValueUsd);

    // Apply liquidation penalty
    const penaltyAmount = totalDebt.multipliedBy(this.LIQUIDATION_PENALTY);
    const totalDebtWithPenalty = totalDebt.plus(penaltyAmount);

    // Calculate collateral to seize
    const collateralToSeize = new BigNumber(loan.collateralAmount);
    
    // If liquidator is involved, apply discount
    const liquidationDiscount = liquidatorId 
      ? collateralValue.multipliedBy(this.LIQUIDATION_DISCOUNT)
      : new BigNumber(0);

    // Execute liquidation
    loan.status = LoanStatus.LIQUIDATED;
    loan.liquidatedAt = new Date();
    await this.loanRepo.save(loan);

    // Transfer collateral to lender (or liquidator if involved)
    const recipient = liquidatorId || loan.lenderId;
    
    await this.rabbitmq.publish(
      EXCHANGES.WALLET_EVENTS,
      'wallet.transfer.internal',
      {
        from: loan.borrowerId,
        to: recipient,
        currency: loan.collateralCurrency,
        amount: collateralToSeize.toFixed(8),
        type: 'LIQUIDATION',
        loanId: loan.id,
        timestamp: new Date(),
      },
    );

    // Notify all parties
    await this.notifyLiquidation(loan, totalDebtWithPenalty.toFixed(8), collateralToSeize.toFixed(8), liquidatorId);

    const result: LiquidationResult = {
      loanId: loan.id,
      liquidated: true,
      collateralSeized: collateralToSeize.toFixed(8),
      debtCovered: totalDebtWithPenalty.toFixed(8),
      liquidationDiscount: liquidationDiscount.toFixed(8),
      timestamp: new Date(),
    };

    this.logger.log(`Liquidation completed for loan ${loanId}: ${JSON.stringify(result)}`);
    
    return result;
  }

  /**
   * Notify all parties of liquidation
   */
  private async notifyLiquidation(
    loan: Loan,
    debtCovered: string,
    collateralSeized: string,
    liquidatorId?: string,
  ): Promise<void> {
    // Notify borrower
    await this.rabbitmq.publish(
      EXCHANGES.NOTIFICATION_EVENTS,
      ROUTING_KEYS.EMAIL_SEND,
      {
        userId: loan.borrowerId,
        template: 'loan-liquidated',
        data: {
          loanId: loan.id,
          collateralSeized,
          collateralCurrency: loan.collateralCurrency,
          debtCovered,
          debtCurrency: loan.principalCurrency,
        },
      },
    );

    // Notify lender
    await this.rabbitmq.publish(
      EXCHANGES.NOTIFICATION_EVENTS,
      ROUTING_KEYS.EMAIL_SEND,
      {
        userId: loan.lenderId,
        template: 'loan-liquidated-lender',
        data: {
          loanId: loan.id,
          collateralReceived: collateralSeized,
          collateralCurrency: loan.collateralCurrency,
          principalRecovered: debtCovered,
        },
      },
    );

    // Notify liquidator if involved
    if (liquidatorId) {
      await this.rabbitmq.publish(
        EXCHANGES.NOTIFICATION_EVENTS,
        ROUTING_KEYS.EMAIL_SEND,
        {
          userId: liquidatorId,
          template: 'liquidation-executed',
          data: {
            loanId: loan.id,
            collateralAcquired: collateralSeized,
            discount: (this.LIQUIDATION_DISCOUNT * 100).toFixed(2) + '%',
          },
        },
      );
    }

    // Send in-app notifications
    await this.rabbitmq.publish(
      EXCHANGES.NOTIFICATION_EVENTS,
      ROUTING_KEYS.IN_APP_NOTIFICATION,
      {
        userId: loan.borrowerId,
        type: 'LOAN_LIQUIDATED',
        priority: 'HIGH',
        title: 'Loan Liquidated',
        message: `Your loan #${loan.id} has been liquidated. ${collateralSeized} ${loan.collateralCurrency} collateral was seized.`,
        data: { loanId: loan.id },
      },
    );
  }

  /**
   * Get liquidation opportunities (loans eligible for liquidation)
   */
  async getLiquidationOpportunities(): Promise<Array<{
    loan: Loan;
    monitoring: CollateralMonitoring;
    profitPotential: string;
  }>> {
    const MIN_HEALTH_FACTOR = 1.1;

    const atRiskMonitoring = await this.monitoringRepo
      .createQueryBuilder('cm')
      .innerJoinAndSelect('cm.loan', 'loan')
      .where('loan.status = :status', { status: LoanStatus.ACTIVE })
      .andWhere('CAST(cm.health_factor AS DECIMAL) < :healthFactor', { 
        healthFactor: MIN_HEALTH_FACTOR,
      })
      .orderBy('cm.health_factor', 'ASC')
      .getMany();

    return atRiskMonitoring.map((monitoring) => {
      const collateralValue = new BigNumber(monitoring.collateralValueUsd);
      const discount = collateralValue.multipliedBy(this.LIQUIDATION_DISCOUNT);
      
      return {
        loan: monitoring.loan,
        monitoring,
        profitPotential: discount.toFixed(2),
      };
    });
  }
}
