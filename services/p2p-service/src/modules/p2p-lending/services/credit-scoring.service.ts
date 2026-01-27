import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditScore, CreditGrade } from '../entities/credit-score.entity';
import { Loan, LoanStatus } from '../entities/loan.entity';
import BigNumber from 'bignumber.js';
import { BlockchainAnalyticsClient } from '@packages/utils';

interface CreditScoreComponents {
  repaymentHistory: number;
  creditUtilization: number;
  accountAge: number;
  loanDiversity: number;
  defaults: number;
  onchainActivity: number;
}

@Injectable()
export class CreditScoringService {
  private readonly logger = new Logger(CreditScoringService.name);

  // Score weights (must sum to 100)
  private readonly weights = {
    repaymentHistory: 0.4, // 40%
    creditUtilization: 0.2, // 20%
    accountAge: 0.15, // 15%
    loanDiversity: 0.1, // 10%
    defaults: 0.1, // 10%
    onchainActivity: 0.05, // 5%
  };

  constructor(
    @InjectRepository(CreditScore)
    private creditScoreRepo: Repository<CreditScore>,
    @InjectRepository(Loan)
    private loanRepo: Repository<Loan>,
    private blockchainAnalytics: BlockchainAnalyticsClient,
  ) {}

  /**
   * Calculate credit score for a user (0-1000)
   */
  async calculateCreditScore(userId: string): Promise<CreditScore> {
    this.logger.log(`Calculating credit score for user ${userId}`);

    // Get or create credit score record
    let creditScore = await this.creditScoreRepo.findOne({
      where: { userId },
    });

    if (!creditScore) {
      creditScore = this.creditScoreRepo.create({
        userId,
        score: 500, // Default starting score
        grade: CreditGrade.C,
      });
    }

    // Get user's loan history
    const loans = await this.loanRepo.find({
      where: { borrowerId: userId },
      order: { createdAt: 'DESC' },
    });

    if (loans.length === 0) {
      // New user with no history
      return await this.creditScoreRepo.save(creditScore);
    }

    // Calculate each component
    const components = await this.calculateComponents(userId, loans, creditScore);

    // Calculate weighted score
    const totalScore = Math.round(
      components.repaymentHistory * this.weights.repaymentHistory +
        components.creditUtilization * this.weights.creditUtilization +
        components.accountAge * this.weights.accountAge +
        components.loanDiversity * this.weights.loanDiversity +
        components.defaults * this.weights.defaults +
        components.onchainActivity * this.weights.onchainActivity,
    );

    // Update credit score
    creditScore.score = Math.max(0, Math.min(1000, totalScore));
    creditScore.grade = this.calculateGrade(creditScore.score);
    creditScore.repaymentHistoryScore = components.repaymentHistory.toFixed(2);
    creditScore.creditUtilizationScore = components.creditUtilization.toFixed(2);
    creditScore.accountAgeScore = components.accountAge.toFixed(2);
    creditScore.loanDiversityScore = components.loanDiversity.toFixed(2);
    creditScore.defaultsScore = components.defaults.toFixed(2);
    creditScore.onchainActivityScore = components.onchainActivity.toFixed(2);
    creditScore.calculatedAt = new Date();

    // Update statistics
    await this.updateStatistics(creditScore, loans);

    return await this.creditScoreRepo.save(creditScore);
  }

  /**
   * Calculate individual score components
   */
  private async calculateComponents(
    userId: string,
    loans: Loan[],
    creditScore: CreditScore,
  ): Promise<CreditScoreComponents> {
    return {
      repaymentHistory: this.calculateRepaymentHistoryScore(loans, creditScore),
      creditUtilization: this.calculateCreditUtilizationScore(loans),
      accountAge: this.calculateAccountAgeScore(creditScore),
      loanDiversity: this.calculateLoanDiversityScore(loans),
      defaults: this.calculateDefaultsScore(loans, creditScore),
      onchainActivity: await this.calculateOnchainActivityScore(userId),
    };
  }

  /**
   * Repayment History Score (0-1000) - 40% weight
   * Based on on-time payments, completion rate, and payment consistency
   */
  private calculateRepaymentHistoryScore(loans: Loan[], creditScore: CreditScore): number {
    const completedLoans = loans.filter((l) => l.status === LoanStatus.REPAID);
    const totalLoans = loans.filter(
      (l) => l.status === LoanStatus.REPAID || l.status === LoanStatus.DEFAULTED,
    );

    if (totalLoans.length === 0) return 500; // Default for no history

    // Completion rate (0-400 points)
    const completionRate = completedLoans.length / totalLoans.length;
    const completionScore = completionRate * 400;

    // On-time payment rate (0-400 points)
    const onTimeRate =
      creditScore.onTimePayments / Math.max(1, creditScore.onTimePayments + creditScore.latePayments);
    const onTimeScore = onTimeRate * 400;

    // Recent performance bonus (0-200 points)
    const recentLoans = loans.slice(0, 5);
    const recentCompletionRate =
      recentLoans.filter((l) => l.status === LoanStatus.REPAID).length / Math.max(1, recentLoans.length);
    const recentBonus = recentCompletionRate * 200;

    return Math.round(completionScore + onTimeScore + recentBonus);
  }

  /**
   * Credit Utilization Score (0-1000) - 20% weight
   * Based on current active loans vs historical average
   */
  private calculateCreditUtilizationScore(loans: Loan[]): number {
    const activeLoans = loans.filter((l) => l.status === LoanStatus.ACTIVE);
    const totalActiveAmount = activeLoans.reduce(
      (sum, loan) => sum.plus(loan.principalAmount),
      new BigNumber(0),
    );

    // Calculate average loan amount
    const repaidLoans = loans.filter((l) => l.status === LoanStatus.REPAID);
    if (repaidLoans.length === 0 && activeLoans.length === 0) return 800; // No loans = good

    const avgLoanAmount =
      repaidLoans.length > 0
        ? repaidLoans
            .reduce((sum, loan) => sum.plus(loan.principalAmount), new BigNumber(0))
            .div(repaidLoans.length)
        : totalActiveAmount;

    // Utilization ratio
    const utilizationRatio = avgLoanAmount.isZero()
      ? 0
      : totalActiveAmount.div(avgLoanAmount.multipliedBy(5)).toNumber(); // 5x avg as "max"

    // Lower utilization = better score
    if (utilizationRatio === 0) return 900;
    if (utilizationRatio < 0.3) return 850;
    if (utilizationRatio < 0.5) return 750;
    if (utilizationRatio < 0.7) return 600;
    if (utilizationRatio < 0.9) return 450;
    return 300;
  }

  /**
   * Account Age Score (0-1000) - 15% weight
   * Older accounts with lending history score higher
   */
  private calculateAccountAgeScore(creditScore: CreditScore): number {
    const ageDays = creditScore.accountAgeDays;

    if (ageDays < 7) return 200; // Very new
    if (ageDays < 30) return 400; // New
    if (ageDays < 90) return 600; // Moderate
    if (ageDays < 180) return 750; // Good
    if (ageDays < 365) return 850; // Very good
    return 950; // Excellent (1+ years)
  }

  /**
   * Loan Diversity Score (0-1000) - 10% weight
   * Different loan amounts, durations, and collateral types
   */
  private calculateLoanDiversityScore(loans: Loan[]): number {
    if (loans.length === 0) return 500; // Default

    // Unique currencies used
    const uniqueCurrencies = new Set(loans.map((l) => l.principalCurrency)).size;
    const currencyScore = Math.min(uniqueCurrencies * 150, 400);

    // Variety in loan amounts (coefficient of variation)
    const amounts = loans.map((l) => parseFloat(l.principalAmount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgAmount > 0 ? stdDev / avgAmount : 0;
    const varietyScore = Math.min(cv * 300, 300);

    // Duration variety
    const uniqueDurations = new Set(loans.map((l) => l.durationDays)).size;
    const durationScore = Math.min(uniqueDurations * 100, 300);

    return Math.round(currencyScore + varietyScore + durationScore);
  }

  /**
   * Defaults Score (0-1000) - 10% weight
   * Penalizes defaults and late payments
   */
  private calculateDefaultsScore(loans: Loan[], creditScore: CreditScore): number {
    const totalLoans = loans.length;
    if (totalLoans === 0) return 800; // Default for no history

    const defaultedLoans = creditScore.defaultedLoans;
    const defaultRate = defaultedLoans / totalLoans;

    // Severe penalty for defaults
    let score = 1000;
    score -= defaultRate * 1000; // -1000 per 100% default rate
    score -= creditScore.latePayments * 20; // -20 per late payment

    // Extra penalty for recent defaults
    const recentDefaults = loans
      .slice(0, 5)
      .filter((l) => l.status === LoanStatus.DEFAULTED).length;
    score -= recentDefaults * 100;

    return Math.max(0, Math.round(score));
  }

  /**
   * On-chain Activity Score (0-1000) - 5% weight
   * Based on blockchain activity and wallet age
   * Integrated with blockchain analytics service
   */
  private async calculateOnchainActivityScore(userId: string): Promise<number> {
    try {
      // Get user's wallet address (you'll need to fetch this from user service)
      const walletAddress = await this.getUserWalletAddress(userId);
      
      if (!walletAddress) {
        this.logger.debug(`No wallet address found for user ${userId}, using default score`);
        return 500; // Default score for users without wallet
      }

      // Analyze wallet on-chain activity
      const analytics = await this.blockchainAnalytics.analyzeWallet(walletAddress);

      // Calculate score based on analytics
      let score = 0;

      // Account age contribution (0-300 points)
      if (analytics.accountAge > 365) score += 300;
      else if (analytics.accountAge > 180) score += 200;
      else if (analytics.accountAge > 90) score += 100;
      else if (analytics.accountAge > 30) score += 50;

      // Transaction activity (0-250 points)
      if (analytics.totalTransactions > 100) score += 250;
      else if (analytics.totalTransactions > 50) score += 150;
      else if (analytics.totalTransactions > 20) score += 75;
      else score += analytics.totalTransactions * 2;

      // DeFi experience (0-200 points)
      score += Math.min(200, analytics.defiProtocolInteractions * 10);

      // Active months consistency (0-150 points)
      score += Math.min(150, analytics.activeMonths * 10);

      // Token diversity (0-100 points)
      score += Math.min(100, analytics.tokenHoldingDiversity * 10);

      // Penalty for high risk score
      score -= analytics.riskScore * 2;

      // Ensure score is within 0-1000
      return Math.max(0, Math.min(1000, Math.round(score)));
    } catch (error) {
      this.logger.error(`Failed to calculate on-chain score for user ${userId}:`, error);
      // Return moderate score on error
      return 500;
    }
  }

  /**
   * Get user's primary wallet address
   * This should integrate with your user/wallet service
   */
  private async getUserWalletAddress(userId: string): Promise<string | null> {
    // TODO: Fetch from user service or wallet service
    // For now, return null to use default scoring
    // In production, this would query: GET /api/users/{userId}/wallet-address
    return null;
  }

  /**
   * Calculate credit grade from score
   */
  private calculateGrade(score: number): CreditGrade {
    if (score >= 900) return CreditGrade.A_PLUS;
    if (score >= 800) return CreditGrade.A;
    if (score >= 700) return CreditGrade.B;
    if (score >= 600) return CreditGrade.C;
    if (score >= 500) return CreditGrade.D;
    return CreditGrade.F;
  }

  /**
   * Update credit score statistics
   */
  private async updateStatistics(creditScore: CreditScore, loans: Loan[]): Promise<void> {
    creditScore.totalLoans = loans.length;
    creditScore.completedLoans = loans.filter((l) => l.status === LoanStatus.REPAID).length;
    creditScore.defaultedLoans = loans.filter((l) => l.status === LoanStatus.DEFAULTED).length;

    const totalBorrowed = loans.reduce(
      (sum, loan) => sum.plus(loan.principalAmount),
      new BigNumber(0),
    );
    creditScore.totalBorrowed = totalBorrowed.toString();

    const repaidLoans = loans.filter((l) => l.status === LoanStatus.REPAID);
    const totalRepaid = repaidLoans.reduce(
      (sum, loan) => sum.plus(loan.totalPaid),
      new BigNumber(0),
    );
    creditScore.totalRepaid = totalRepaid.toString();

    // Calculate average LTV
    if (loans.length > 0) {
      const avgLtv = loans.reduce((sum, loan) => sum + parseFloat(loan.ltvRatio), 0) / loans.length;
      creditScore.avgLtv = avgLtv.toFixed(4);
    }

    // Update last loan date
    if (loans.length > 0) {
      creditScore.lastLoanAt = loans[0].createdAt;
    }
  }

  /**
   * Get credit score for user
   */
  async getCreditScore(userId: string): Promise<CreditScore | null> {
    return await this.creditScoreRepo.findOne({ where: { userId } });
  }

  /**
   * Initialize credit score for new user
   */
  async initializeCreditScore(userId: string, accountCreatedAt: Date): Promise<CreditScore> {
    const existingScore = await this.creditScoreRepo.findOne({
      where: { userId },
    });

    if (existingScore) {
      return existingScore;
    }

    const accountAgeDays = Math.floor(
      (Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const creditScore = this.creditScoreRepo.create({
      userId,
      score: 500,
      grade: CreditGrade.C,
      accountAgeDays,
      calculatedAt: new Date(),
    });

    return await this.creditScoreRepo.save(creditScore);
  }
}
