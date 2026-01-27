import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanRequest, RequestStatus } from '../entities/loan-request.entity';
import { CreditScore } from '../entities/credit-score.entity';
import BigNumber from 'bignumber.js';

export interface RateFactors {
  baseRate: number;
  supplyDemandFactor: number;
  volatilityFactor: number;
  creditFactor: number;
  ltvFactor: number;
  durationFactor: number;
}

export interface RateCalculationResult {
  finalRate: number;
  factors: RateFactors;
  utilizationRate: number;
}

@Injectable()
export class InterestRateService {
  private readonly logger = new Logger(InterestRateService.name);

  // Base rates by asset (APR %)
  private readonly baseRates = {
    USDT: 5,
    USDC: 5,
    DAI: 5,
    BTC: 8,
    ETH: 7,
    BNB: 9,
    DEFAULT: 10,
  };

  // Volatility factors by asset
  private readonly volatilityScores = {
    USDT: 0, // Stablecoin
    USDC: 0,
    DAI: 0,
    BTC: 2,
    ETH: 2.5,
    BNB: 3,
    DEFAULT: 3,
  };

  constructor(
    @InjectRepository(LoanRequest)
    private loanRequestRepo: Repository<LoanRequest>,
  ) {}

  /**
   * Calculate interest rate based on multiple factors
   * Formula: Rate = BaseRate + SupplyDemand + Volatility + Credit + LTV + Duration
   */
  async calculateInterestRate(
    asset: string,
    ltvRatio: number,
    durationDays: number,
    creditScore?: CreditScore,
    collateralAsset?: string,
  ): Promise<RateCalculationResult> {
    this.logger.debug(`Calculating rate for ${asset}, LTV: ${ltvRatio}, Duration: ${durationDays}`);

    // Get base rate
    const baseRate = this.baseRates[asset] || this.baseRates.DEFAULT;

    // Calculate each factor
    const supplyDemandFactor = await this.calculateSupplyDemandFactor(asset);
    const volatilityFactor = this.calculateVolatilityFactor(collateralAsset || asset);
    const creditFactor = this.calculateCreditFactor(creditScore);
    const ltvFactor = this.calculateLtvFactor(ltvRatio);
    const durationFactor = this.calculateDurationFactor(durationDays);

    // Sum all factors
    const finalRate =
      baseRate +
      supplyDemandFactor +
      volatilityFactor +
      creditFactor +
      ltvFactor +
      durationFactor;

    const factors: RateFactors = {
      baseRate,
      supplyDemandFactor,
      volatilityFactor,
      creditFactor,
      ltvFactor,
      durationFactor,
    };

    const utilizationRate = await this.calculateUtilizationRate(asset);

    return {
      finalRate: Math.max(1, Math.min(50, finalRate)), // Cap between 1-50%
      factors,
      utilizationRate,
    };
  }

  /**
   * Supply/Demand Factor (±2%)
   * Based on marketplace supply vs demand
   */
  private async calculateSupplyDemandFactor(asset: string): Promise<number> {
    // Get open loan offers (supply)
    const offers = await this.loanRequestRepo.find({
      where: {
        requestType: 'OFFER' as any,
        principalCurrency: asset,
        status: RequestStatus.OPEN,
      },
    });

    // Get open loan requests (demand)
    const requests = await this.loanRequestRepo.find({
      where: {
        requestType: 'REQUEST' as any,
        principalCurrency: asset,
        status: RequestStatus.OPEN,
      },
    });

    const totalSupply = offers.reduce(
      (sum, offer) => sum.plus(offer.principalAmount),
      new BigNumber(0),
    );

    const totalDemand = requests.reduce(
      (sum, req) => sum.plus(req.principalAmount),
      new BigNumber(0),
    );

    if (totalSupply.isZero() && totalDemand.isZero()) {
      return 0; // No market data
    }

    if (totalSupply.isZero()) {
      return 2; // High demand, no supply = higher rates
    }

    // Calculate supply/demand ratio
    const ratio = totalDemand.div(totalSupply).toNumber();

    // Higher demand than supply = increase rate
    // Lower demand than supply = decrease rate
    if (ratio > 2) return 2; // Very high demand
    if (ratio > 1.5) return 1.5;
    if (ratio > 1.2) return 1;
    if (ratio > 1) return 0.5;
    if (ratio === 1) return 0;
    if (ratio > 0.8) return -0.5;
    if (ratio > 0.5) return -1;
    return -2; // Very low demand
  }

  /**
   * Volatility Factor (+0-3%)
   * Based on collateral asset volatility
   */
  private calculateVolatilityFactor(collateralAsset: string): number {
    return this.volatilityScores[collateralAsset] || this.volatilityScores.DEFAULT;
  }

  /**
   * Credit Score Factor (±2%)
   * Better credit = lower rates
   */
  private calculateCreditFactor(creditScore?: CreditScore): number {
    if (!creditScore) return 2; // No credit history = higher rate

    const score = creditScore.score;

    // Credit score adjustments
    if (score >= 900) return -2; // A+ grade
    if (score >= 800) return -1.5; // A grade
    if (score >= 700) return -1; // B grade
    if (score >= 600) return 0; // C grade
    if (score >= 500) return 1; // D grade
    return 2; // F grade
  }

  /**
   * LTV Factor (+0-2%)
   * Higher LTV = higher risk = higher rate
   */
  private calculateLtvFactor(ltvRatio: number): number {
    if (ltvRatio < 50) return 0;
    if (ltvRatio < 75) return 0.5;
    if (ltvRatio < 100) return 1;
    if (ltvRatio < 125) return 1.5;
    return 2; // High LTV (>125%)
  }

  /**
   * Duration Factor (+0-3%)
   * Longer duration = higher rate
   */
  private calculateDurationFactor(durationDays: number): number {
    if (durationDays <= 7) return 0;
    if (durationDays <= 30) return 0.5;
    if (durationDays <= 90) return 1;
    if (durationDays <= 180) return 2;
    return 3; // Long duration (>180 days)
  }

  /**
   * Calculate utilization rate for an asset
   */
  private async calculateUtilizationRate(asset: string): Promise<number> {
    const offers = await this.loanRequestRepo.find({
      where: {
        requestType: 'OFFER' as any,
        principalCurrency: asset,
        status: RequestStatus.OPEN,
      },
    });

    const matched = await this.loanRequestRepo.find({
      where: {
        requestType: 'OFFER' as any,
        principalCurrency: asset,
        status: RequestStatus.MATCHED,
      },
    });

    const totalAvailable = offers.reduce(
      (sum, offer) => sum.plus(offer.principalAmount),
      new BigNumber(0),
    );

    const totalUtilized = matched.reduce(
      (sum, offer) => sum.plus(offer.principalAmount),
      new BigNumber(0),
    );

    const total = totalAvailable.plus(totalUtilized);

    if (total.isZero()) return 0;

    return totalUtilized.div(total).multipliedBy(100).toNumber();
  }

  /**
   * Get recommended interest rate range for a loan request
   */
  async getRecommendedRateRange(
    asset: string,
    ltvRatio: number,
    durationDays: number,
    creditScore?: CreditScore,
    collateralAsset?: string,
  ): Promise<{ min: number; optimal: number; max: number }> {
    const calculation = await this.calculateInterestRate(
      asset,
      ltvRatio,
      durationDays,
      creditScore,
      collateralAsset,
    );

    const optimal = calculation.finalRate;

    return {
      min: Math.max(1, optimal - 2),
      optimal: optimal,
      max: Math.min(50, optimal + 2),
    };
  }

  /**
   * Calculate APY from APR (with compounding)
   */
  calculateAPY(apr: number, compoundingPeriods: number = 365): number {
    const rate = apr / 100;
    const apy = Math.pow(1 + rate / compoundingPeriods, compoundingPeriods) - 1;
    return apy * 100;
  }

  /**
   * Calculate total interest for a loan
   */
  calculateTotalInterest(principal: string, apr: number, durationDays: number): string {
    const principalAmount = new BigNumber(principal);
    const rate = new BigNumber(apr).div(100);
    const years = new BigNumber(durationDays).div(365);

    const interest = principalAmount.multipliedBy(rate).multipliedBy(years);

    return interest.toFixed(8);
  }

  /**
   * Calculate monthly payment (for amortized loans)
   */
  calculateMonthlyPayment(principal: string, apr: number, durationMonths: number): string {
    const p = new BigNumber(principal);
    const r = new BigNumber(apr).div(100).div(12); // Monthly rate
    const n = new BigNumber(durationMonths);

    if (r.isZero()) {
      return p.div(n).toFixed(8);
    }

    // Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    const numerator = p.multipliedBy(r).multipliedBy(r.plus(1).pow(n.toNumber()));
    const denominator = r.plus(1).pow(n.toNumber()).minus(1);

    return numerator.div(denominator).toFixed(8);
  }

  /**
   * Get market statistics
   */
  async getMarketStatistics(asset: string): Promise<{
    averageRate: number;
    minRate: number;
    maxRate: number;
    totalOffers: number;
    totalRequests: number;
    utilizationRate: number;
  }> {
    const offers = await this.loanRequestRepo.find({
      where: {
        requestType: 'OFFER' as any,
        principalCurrency: asset,
        status: RequestStatus.OPEN,
      },
    });

    const requests = await this.loanRequestRepo.find({
      where: {
        requestType: 'REQUEST' as any,
        principalCurrency: asset,
        status: RequestStatus.OPEN,
      },
    });

    const offerRates = offers
      .filter((o) => o.minInterestRate)
      .map((o) => parseFloat(o.minInterestRate!));

    const requestRates = requests
      .filter((r) => r.maxInterestRate)
      .map((r) => parseFloat(r.maxInterestRate!));

    const allRates = [...offerRates, ...requestRates];

    const utilizationRate = await this.calculateUtilizationRate(asset);

    return {
      averageRate: allRates.length > 0 ? allRates.reduce((a, b) => a + b, 0) / allRates.length : 0,
      minRate: allRates.length > 0 ? Math.min(...allRates) : 0,
      maxRate: allRates.length > 0 ? Math.max(...allRates) : 0,
      totalOffers: offers.length,
      totalRequests: requests.length,
      utilizationRate,
    };
  }
}
