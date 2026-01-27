import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan, LoanStatus } from '../entities/loan.entity';
import { LoanRequest, RequestType, RequestStatus } from '../entities/loan-request.entity';
import { LoanRepayment } from '../entities/loan-repayment.entity';
import { CreditScoringService } from './credit-scoring.service';
import { InterestRateService } from './interest-rate.service';
import { LoanMatchingService } from './loan-matching.service';
import { CreateLoanOfferDto, CreateLoanRequestDto, RepayLoanDto } from '../dto/loan.dto';
import BigNumber from 'bignumber.js';

@Injectable()
export class LoanService {
  private readonly logger = new Logger(LoanService.name);

  constructor(
    @InjectRepository(Loan)
    private loanRepo: Repository<Loan>,
    @InjectRepository(LoanRequest)
    private loanRequestRepo: Repository<LoanRequest>,
    @InjectRepository(LoanRepayment)
    private repaymentRepo: Repository<LoanRepayment>,
    private creditScoringService: CreditScoringService,
    private interestRateService: InterestRateService,
    private matchingService: LoanMatchingService,
  ) {}

  /**
   * Create loan offer (lender)
   */
  async createLoanOffer(userId: string, dto: CreateLoanOfferDto): Promise<LoanRequest> {
    this.logger.log(`User ${userId} creating loan offer for ${dto.amount} ${dto.currency}`);

    // Set expiration (default 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const loanRequest = this.loanRequestRepo.create({
      userId,
      requestType: RequestType.OFFER,
      principalAmount: dto.amount,
      principalCurrency: dto.currency,
      minInterestRate: dto.minInterestRate.toFixed(4),
      durationDays: dto.durationDays,
      minCreditScore: dto.minCreditScore,
      maxLtvRatio: dto.maxLtvRatio?.toFixed(4),
      autoMatchEnabled: dto.autoMatch !== false,
      status: RequestStatus.OPEN,
      expiresAt,
    });

    const saved = await this.loanRequestRepo.save(loanRequest);

    // Trigger matching immediately if auto-match enabled
    if (saved.autoMatchEnabled) {
      setTimeout(() => this.matchingService.findMatches(saved.id), 1000);
    }

    return saved;
  }

  /**
   * Create loan request (borrower)
   */
  async createLoanRequest(userId: string, dto: CreateLoanRequestDto): Promise<LoanRequest> {
    this.logger.log(`User ${userId} creating loan request for ${dto.amount} ${dto.currency}`);

    // Get user's credit score
    const creditScore = await this.creditScoringService.getCreditScore(userId);

    // Calculate LTV ratio
    const collateralValueUsd = await this.estimateValue(dto.collateralAsset, dto.collateralAmount);
    const principalValueUsd = await this.estimateValue(dto.currency, dto.amount);
    const proposedLtv = (principalValueUsd / collateralValueUsd) * 100;

    // Validate LTV (max 200%)
    if (proposedLtv > 200) {
      throw new BadRequestException('LTV ratio cannot exceed 200%');
    }

    // Set expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const loanRequest = this.loanRequestRepo.create({
      userId,
      requestType: RequestType.REQUEST,
      principalAmount: dto.amount,
      principalCurrency: dto.currency,
      collateralAmount: dto.collateralAmount,
      collateralCurrency: dto.collateralAsset,
      collateralType: 'CRYPTO',
      proposedLtv: proposedLtv.toFixed(4),
      maxInterestRate: dto.maxInterestRate.toFixed(4),
      durationDays: dto.durationDays,
      autoMatchEnabled: dto.autoMatch !== false,
      status: RequestStatus.OPEN,
      expiresAt,
    });

    const saved = await this.loanRequestRepo.save(loanRequest);

    // Trigger matching if auto-match enabled
    if (saved.autoMatchEnabled) {
      setTimeout(() => this.matchingService.findMatches(saved.id), 1000);
    }

    return saved;
  }

  /**
   * Get loan by ID
   */
  async getLoan(loanId: string, userId?: string): Promise<Loan> {
    const loan = await this.loanRepo.findOne({
      where: { id: loanId },
      relations: ['repayments'],
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    // Optionally check user access
    if (userId && loan.lenderId !== userId && loan.borrowerId !== userId) {
      throw new NotFoundException('Loan not found');
    }

    // Update accrued interest if active
    if (loan.status === LoanStatus.ACTIVE) {
      await this.updateAccruedInterest(loan);
    }

    return loan;
  }

  /**
   * Get user's loans
   */
  async getUserLoans(userId: string, asRole?: 'lender' | 'borrower'): Promise<Loan[]> {
    const where: any = {};

    if (asRole === 'lender') {
      where.lenderId = userId;
    } else if (asRole === 'borrower') {
      where.borrowerId = userId;
    } else {
      // Get both
      const lenderLoans = await this.loanRepo.find({
        where: { lenderId: userId },
        order: { createdAt: 'DESC' },
      });

      const borrowerLoans = await this.loanRepo.find({
        where: { borrowerId: userId },
        order: { createdAt: 'DESC' },
      });

      return [...lenderLoans, ...borrowerLoans];
    }

    return await this.loanRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Repay loan (full or partial)
   */
  async repayLoan(userId: string, dto: RepayLoanDto): Promise<Loan> {
    const loan = await this.getLoan(dto.loanId);

    // Verify borrower
    if (loan.borrowerId !== userId) {
      throw new BadRequestException('Only borrower can repay this loan');
    }

    // Check loan status
    if (loan.status !== LoanStatus.ACTIVE) {
      throw new BadRequestException('Loan is not active');
    }

    // Update accrued interest
    await this.updateAccruedInterest(loan);

    // Calculate total owed
    const principal = new BigNumber(loan.principalAmount);
    const interest = new BigNumber(loan.accruedInterest);
    const totalOwed = principal.plus(interest).minus(loan.totalPaid);

    const paymentAmount = new BigNumber(dto.amount);

    if (paymentAmount.isGreaterThan(totalOwed)) {
      throw new BadRequestException('Payment amount exceeds total owed');
    }

    // Determine how much goes to principal vs interest
    let interestPaid = BigNumber.min(paymentAmount, interest);
    let principalPaid = paymentAmount.minus(interestPaid);

    // Record repayment
    const repayment = this.repaymentRepo.create({
      loanId: loan.id,
      amount: paymentAmount.toFixed(8),
      principalPaid: principalPaid.toFixed(8),
      interestPaid: interestPaid.toFixed(8),
      transactionHash: dto.transactionHash || `tx_${Date.now()}`,
      confirmedAt: new Date(),
    });

    await this.repaymentRepo.save(repayment);

    // Update loan
    loan.totalPaid = new BigNumber(loan.totalPaid).plus(paymentAmount).toFixed(8);
    loan.accruedInterest = interest.minus(interestPaid).toFixed(8);

    // Check if fully repaid
    const remainingOwed = totalOwed.minus(paymentAmount);
    if (remainingOwed.isLessThanOrEqualTo(0.00000001)) {
      // Fully repaid
      loan.status = LoanStatus.REPAID;
      loan.repaidAt = new Date();

      this.logger.log(`Loan ${loan.id} fully repaid`);

      // Update credit score
      await this.creditScoringService.calculateCreditScore(userId);
    }

    return await this.loanRepo.save(loan);
  }

  /**
   * Update accrued interest for a loan
   */
  private async updateAccruedInterest(loan: Loan): Promise<void> {
    const now = Date.now();
    const lastUpdate = loan.lastInterestCalculation.getTime();
    const timeElapsed = (now - lastUpdate) / 1000; // seconds

    if (timeElapsed < 60) return; // Don't update if less than 1 minute

    const principal = new BigNumber(loan.principalAmount);
    const rate = new BigNumber(loan.interestRate).div(100);
    const secondsPerYear = 31536000;

    const newInterest = principal
      .multipliedBy(rate)
      .multipliedBy(timeElapsed)
      .div(secondsPerYear);

    loan.accruedInterest = new BigNumber(loan.accruedInterest).plus(newInterest).toFixed(8);
    loan.lastInterestCalculation = new Date();

    await this.loanRepo.save(loan);
  }

  /**
   * Get loan requests for user
   */
  async getUserLoanRequests(userId: string, status?: RequestStatus): Promise<LoanRequest[]> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return await this.loanRequestRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cancel loan request
   */
  async cancelLoanRequest(userId: string, requestId: string): Promise<LoanRequest> {
    const request = await this.loanRequestRepo.findOne({
      where: { id: requestId, userId },
    });

    if (!request) {
      throw new NotFoundException('Loan request not found');
    }

    if (request.status !== RequestStatus.OPEN) {
      throw new BadRequestException('Can only cancel open requests');
    }

    request.status = RequestStatus.CANCELLED;
    return await this.loanRequestRepo.save(request);
  }

  /**
   * Get marketplace listings
   */
  async getMarketplaceListings(
    type: RequestType,
    currency?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: LoanRequest[]; total: number; page: number; limit: number }> {
    const where: any = {
      requestType: type,
      status: RequestStatus.OPEN,
    };

    if (currency) {
      where.principalCurrency = currency;
    }

    const [data, total] = await this.loanRequestRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /**
   * Calculate loan summary
   */
  async getLoanSummary(loanId: string): Promise<{
    loan: Loan;
    totalOwed: string;
    totalPaid: string;
    remainingBalance: string;
    daysRemaining: number;
    isOverdue: boolean;
  }> {
    const loan = await this.getLoan(loanId);

    const principal = new BigNumber(loan.principalAmount);
    const accruedInterest = new BigNumber(loan.accruedInterest);
    const totalOwed = principal.plus(accruedInterest);
    const totalPaid = new BigNumber(loan.totalPaid);
    const remainingBalance = totalOwed.minus(totalPaid);

    const now = new Date();
    const dueDate = new Date(loan.dueDate);
    const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysRemaining < 0 && loan.status === LoanStatus.ACTIVE;

    return {
      loan,
      totalOwed: totalOwed.toFixed(8),
      totalPaid: totalPaid.toFixed(8),
      remainingBalance: remainingBalance.toFixed(8),
      daysRemaining,
      isOverdue,
    };
  }

  /**
   * Estimate USD value (mock implementation)
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
}
