import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoanRequest, RequestType, RequestStatus } from '../entities/loan-request.entity';
import { CreditScore } from '../entities/credit-score.entity';
import { Loan, LoanStatus } from '../entities/loan.entity';
import { InterestRateService } from './interest-rate.service';
import { CreditScoringService } from './credit-scoring.service';
import BigNumber from 'bignumber.js';

export interface LoanMatch {
  offer: LoanRequest;
  request: LoanRequest;
  matchScore: number;
  suggestedRate: number;
  compatibilityReasons: string[];
}

@Injectable()
export class LoanMatchingService {
  private readonly logger = new Logger(LoanMatchingService.name);

  constructor(
    @InjectRepository(LoanRequest)
    private loanRequestRepo: Repository<LoanRequest>,
    @InjectRepository(Loan)
    private loanRepo: Repository<Loan>,
    @InjectRepository(CreditScore)
    private creditScoreRepo: Repository<CreditScore>,
    private interestRateService: InterestRateService,
    private creditScoringService: CreditScoringService,
  ) {}

  /**
   * Find potential matches for a loan request
   */
  async findMatches(requestId: string, limit: number = 10): Promise<LoanMatch[]> {
    const request = await this.loanRequestRepo.findOne({
      where: { id: requestId, status: RequestStatus.OPEN },
    });

    if (!request) {
      throw new Error('Request not found or not open');
    }

    const oppositeType = request.requestType === RequestType.OFFER ? RequestType.REQUEST : RequestType.OFFER;

    // Find opposite requests with same currency
    const candidates = await this.loanRequestRepo.find({
      where: {
        requestType: oppositeType,
        principalCurrency: request.principalCurrency,
        status: RequestStatus.OPEN,
      },
      order: { createdAt: 'ASC' },
    });

    // Score and filter matches
    const matches: LoanMatch[] = [];

    for (const candidate of candidates) {
      const match = await this.evaluateMatch(request, candidate);
      
      if (match && match.matchScore >= 50) { // Minimum 50% compatibility
        matches.push(match);
      }
    }

    // Sort by match score (descending)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return matches.slice(0, limit);
  }

  /**
   * Evaluate compatibility between two loan requests
   */
  private async evaluateMatch(
    request1: LoanRequest,
    request2: LoanRequest,
  ): Promise<LoanMatch | null> {
    // Ensure they're opposite types
    if (request1.requestType === request2.requestType) {
      return null;
    }

    const offer = request1.requestType === RequestType.OFFER ? request1 : request2;
    const request = request1.requestType === RequestType.REQUEST ? request1 : request2;

    const compatibilityReasons: string[] = [];
    let matchScore = 0;

    // 1. Amount compatibility (25 points)
    const amountScore = this.scoreAmountCompatibility(offer, request);
    matchScore += amountScore;
    if (amountScore > 0) {
      compatibilityReasons.push(`Amount compatible (${amountScore}/25)`);
    }

    // 2. Interest rate compatibility (25 points)
    const rateScore = this.scoreRateCompatibility(offer, request);
    matchScore += rateScore;
    if (rateScore > 0) {
      compatibilityReasons.push(`Rate compatible (${rateScore}/25)`);
    }

    // 3. Duration compatibility (15 points)
    const durationScore = this.scoreDurationCompatibility(offer, request);
    matchScore += durationScore;
    if (durationScore > 0) {
      compatibilityReasons.push(`Duration compatible (${durationScore}/15)`);
    }

    // 4. Credit score compatibility (20 points)
    const creditScore = await this.scoreCreditCompatibility(offer, request);
    matchScore += creditScore;
    if (creditScore > 0) {
      compatibilityReasons.push(`Credit score compatible (${creditScore}/20)`);
    }

    // 5. LTV compatibility (15 points)
    const ltvScore = this.scoreLtvCompatibility(offer, request);
    matchScore += ltvScore;
    if (ltvScore > 0) {
      compatibilityReasons.push(`LTV compatible (${ltvScore}/15)`);
    }

    // Return null if not compatible enough
    if (matchScore < 50) {
      return null;
    }

    // Calculate suggested rate (midpoint or based on factors)
    const suggestedRate = await this.calculateSuggestedRate(offer, request);

    return {
      offer,
      request,
      matchScore,
      suggestedRate,
      compatibilityReasons,
    };
  }

  /**
   * Score amount compatibility (0-25 points)
   */
  private scoreAmountCompatibility(offer: LoanRequest, request: LoanRequest): number {
    const offerAmount = new BigNumber(offer.principalAmount);
    const requestAmount = new BigNumber(request.principalAmount);

    if (offerAmount.isLessThan(requestAmount)) {
      return 0; // Offer too small
    }

    const ratio = requestAmount.div(offerAmount).toNumber();

    // Perfect match
    if (ratio >= 0.95) return 25;
    // Very good match
    if (ratio >= 0.8) return 20;
    // Good match
    if (ratio >= 0.6) return 15;
    // Acceptable match
    if (ratio >= 0.4) return 10;
    // Poor match
    return 5;
  }

  /**
   * Score interest rate compatibility (0-25 points)
   */
  private scoreRateCompatibility(offer: LoanRequest, request: LoanRequest): number {
    const offerMinRate = parseFloat(offer.minInterestRate || '0');
    const requestMaxRate = parseFloat(request.maxInterestRate || '100');

    // Check if rates overlap
    if (offerMinRate > requestMaxRate) {
      return 0; // No overlap - lender wants more than borrower will pay
    }

    // Calculate overlap size
    const overlap = requestMaxRate - offerMinRate;

    // Larger overlap = better compatibility
    if (overlap >= 5) return 25; // 5%+ overlap
    if (overlap >= 3) return 20; // 3-5% overlap
    if (overlap >= 2) return 15; // 2-3% overlap
    if (overlap >= 1) return 10; // 1-2% overlap
    return 5; // <1% overlap
  }

  /**
   * Score duration compatibility (0-15 points)
   */
  private scoreDurationCompatibility(offer: LoanRequest, request: LoanRequest): number {
    const offerDuration = offer.durationDays;
    const requestDuration = request.durationDays;

    // Exact match
    if (offerDuration === requestDuration) return 15;

    // Calculate difference
    const diff = Math.abs(offerDuration - requestDuration);
    const diffPercent = (diff / Math.max(offerDuration, requestDuration)) * 100;

    if (diffPercent <= 10) return 12; // Within 10%
    if (diffPercent <= 20) return 9; // Within 20%
    if (diffPercent <= 30) return 6; // Within 30%
    if (diffPercent <= 50) return 3; // Within 50%
    return 0; // Too different
  }

  /**
   * Score credit compatibility (0-20 points)
   */
  private async scoreCreditCompatibility(
    offer: LoanRequest,
    request: LoanRequest,
  ): Promise<number> {
    // Get borrower's credit score
    const borrowerCreditScore = await this.creditScoreRepo.findOne({
      where: { userId: request.userId },
    });

    if (!borrowerCreditScore) {
      // No credit history - assume moderate score
      if (!offer.minCreditScore || offer.minCreditScore <= 500) {
        return 10;
      }
      return 0;
    }

    const minRequired = offer.minCreditScore || 0;

    // Check if meets minimum
    if (borrowerCreditScore.score < minRequired) {
      return 0; // Doesn't meet minimum
    }

    // Calculate how much above minimum
    const excess = borrowerCreditScore.score - minRequired;

    // Reward exceeding minimum
    if (excess >= 300) return 20; // Exceptional
    if (excess >= 200) return 17; // Excellent
    if (excess >= 100) return 14; // Very good
    if (excess >= 50) return 11; // Good
    return 8; // Meets minimum
  }

  /**
   * Score LTV compatibility (0-15 points)
   */
  private scoreLtvCompatibility(offer: LoanRequest, request: LoanRequest): number {
    if (!request.collateralAmount || !request.proposedLtv) {
      return 0; // No collateral info
    }

    const proposedLtv = parseFloat(request.proposedLtv);
    const maxLtv = parseFloat(offer.maxLtvRatio || '200'); // Default 200%

    // Check if within acceptable range
    if (proposedLtv > maxLtv) {
      return 0; // Too high LTV
    }

    // Calculate safety margin
    const margin = ((maxLtv - proposedLtv) / maxLtv) * 100;

    // Better margin = higher score
    if (margin >= 40) return 15; // Very safe (40%+ margin)
    if (margin >= 25) return 12; // Safe (25-40% margin)
    if (margin >= 15) return 9; // Moderate (15-25% margin)
    if (margin >= 5) return 6; // Acceptable (5-15% margin)
    return 3; // Tight margin (<5%)
  }

  /**
   * Calculate suggested interest rate for a match
   */
  private async calculateSuggestedRate(
    offer: LoanRequest,
    request: LoanRequest,
  ): Promise<number> {
    const offerMinRate = parseFloat(offer.minInterestRate || '0');
    const requestMaxRate = parseFloat(request.maxInterestRate || '100');

    // Get borrower's credit score
    const borrowerCreditScore = await this.creditScoreRepo.findOne({
      where: { userId: request.userId },
    });

    // Calculate market-based rate
    const ltvRatio = parseFloat(request.proposedLtv || '150');
    const rateCalc = await this.interestRateService.calculateInterestRate(
      request.principalCurrency,
      ltvRatio,
      request.durationDays,
      borrowerCreditScore || undefined,
      request.collateralCurrency || undefined,
    );

    const marketRate = rateCalc.finalRate;

    // Use market rate if within range, otherwise use midpoint
    if (marketRate >= offerMinRate && marketRate <= requestMaxRate) {
      return marketRate;
    }

    // Fallback to midpoint
    return (offerMinRate + requestMaxRate) / 2;
  }

  /**
   * Automatically match compatible loan requests
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoMatchLoans(): Promise<void> {
    this.logger.log('Running automatic loan matching...');

    try {
      // Get all open requests with auto-match enabled
      const openRequests = await this.loanRequestRepo.find({
        where: { status: RequestStatus.OPEN, autoMatchEnabled: true },
        order: { createdAt: 'ASC' },
      });

      let matchCount = 0;

      for (const request of openRequests) {
        // Find best match
        const matches = await this.findMatches(request.id, 1);

        if (matches.length > 0) {
          const bestMatch = matches[0];

          // Auto-execute match if score is very high (>=80)
          if (bestMatch.matchScore >= 80) {
            await this.executeMatch(
              bestMatch.offer.id,
              bestMatch.request.id,
              bestMatch.suggestedRate,
            );
            matchCount++;
          }
        }
      }

      this.logger.log(`Auto-matching complete. ${matchCount} loans matched.`);
    } catch (error) {
      this.logger.error(`Auto-matching failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Execute a loan match and create active loan
   */
  async executeMatch(
    offerId: string,
    requestId: string,
    agreedRate: number,
  ): Promise<Loan> {
    this.logger.log(`Executing match: Offer ${offerId} with Request ${requestId}`);

    const offer = await this.loanRequestRepo.findOne({
      where: { id: offerId, status: RequestStatus.OPEN },
    });

    const request = await this.loanRequestRepo.findOne({
      where: { id: requestId, status: RequestStatus.OPEN },
    });

    if (!offer || !request) {
      throw new Error('One or both requests not found or not open');
    }

    // Calculate LTV ratio
    const collateralValueUsd = await this.estimateValue(
      request.collateralCurrency!,
      request.collateralAmount!,
    );
    const principalValueUsd = await this.estimateValue(
      request.principalCurrency,
      request.principalAmount,
    );
    const ltvRatio = (principalValueUsd / collateralValueUsd) * 100;

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + request.durationDays);

    // Create loan
    const loan = this.loanRepo.create({
      lenderId: offer.userId,
      borrowerId: request.userId,
      principalAmount: request.principalAmount,
      principalCurrency: request.principalCurrency,
      collateralAmount: request.collateralAmount!,
      collateralCurrency: request.collateralCurrency!,
      interestRate: agreedRate.toFixed(4),
      durationDays: request.durationDays,
      ltvRatio: ltvRatio.toFixed(4),
      status: LoanStatus.ACTIVE,
      fundedAt: new Date(),
      dueDate,
    });

    const savedLoan = await this.loanRepo.save(loan);

    // Update loan requests
    offer.status = RequestStatus.MATCHED;
    offer.matchedAt = new Date();
    offer.matchedRequestId = requestId;

    request.status = RequestStatus.MATCHED;
    request.matchedAt = new Date();
    request.matchedRequestId = offerId;

    await this.loanRequestRepo.save([offer, request]);

    this.logger.log(`Loan ${savedLoan.id} created from match`);

    return savedLoan;
  }

  /**
   * Estimate USD value of an asset amount
   * TODO: Integrate with real price oracle
   */
  private async estimateValue(asset: string, amount: string): Promise<number> {
    const mockPrices: Record<string, number> = {
      USDT: 1,
      USDC: 1,
      DAI: 1,
      BTC: 45000,
      ETH: 3000,
      BNB: 500,
    };

    const price = mockPrices[asset] || 100;
    return parseFloat(amount) * price;
  }

  /**
   * Cancel expired loan requests
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cancelExpiredRequests(): Promise<void> {
    this.logger.log('Checking for expired loan requests...');

    const now = new Date();

    const expiredRequests = await this.loanRequestRepo.find({
      where: { status: RequestStatus.OPEN },
    });

    const toCancel = expiredRequests.filter(
      (req) => req.expiresAt && req.expiresAt < now,
    );

    if (toCancel.length > 0) {
      for (const req of toCancel) {
        req.status = RequestStatus.EXPIRED;
      }

      await this.loanRequestRepo.save(toCancel);
      this.logger.log(`Cancelled ${toCancel.length} expired requests`);
    }
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats(currency?: string): Promise<{
    totalOffers: number;
    totalRequests: number;
    totalOffersAmount: string;
    totalRequestsAmount: string;
    averageOfferRate: number;
    averageRequestRate: number;
    matchRatePercentage: number;
  }> {
    const where = currency ? { principalCurrency: currency } : {};

    const offers = await this.loanRequestRepo.find({
      where: { ...where, requestType: RequestType.OFFER, status: RequestStatus.OPEN },
    });

    const requests = await this.loanRequestRepo.find({
      where: { ...where, requestType: RequestType.REQUEST, status: RequestStatus.OPEN },
    });

    const matched = await this.loanRequestRepo.count({
      where: { ...where, status: RequestStatus.MATCHED },
    });

    const totalOffersAmount = offers
      .reduce((sum, offer) => sum.plus(offer.principalAmount), new BigNumber(0))
      .toString();

    const totalRequestsAmount = requests
      .reduce((sum, req) => sum.plus(req.principalAmount), new BigNumber(0))
      .toString();

    const offerRates = offers
      .filter((o) => o.minInterestRate)
      .map((o) => parseFloat(o.minInterestRate!));

    const requestRates = requests
      .filter((r) => r.maxInterestRate)
      .map((r) => parseFloat(r.maxInterestRate!));

    const totalRequests = offers.length + requests.length;
    const matchRatePercentage = totalRequests > 0 ? (matched / totalRequests) * 100 : 0;

    return {
      totalOffers: offers.length,
      totalRequests: requests.length,
      totalOffersAmount,
      totalRequestsAmount,
      averageOfferRate:
        offerRates.length > 0 ? offerRates.reduce((a, b) => a + b, 0) / offerRates.length : 0,
      averageRequestRate:
        requestRates.length > 0
          ? requestRates.reduce((a, b) => a + b, 0) / requestRates.length
          : 0,
      matchRatePercentage,
    };
  }
}
