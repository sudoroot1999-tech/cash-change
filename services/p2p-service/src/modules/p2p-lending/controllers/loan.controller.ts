import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoanService } from '../services/loan.service';
import { LoanMatchingService } from '../services/loan-matching.service';
import { CreditScoringService } from '../services/credit-scoring.service';
import { InterestRateService } from '../services/interest-rate.service';
import { CollateralMonitoringService } from '../services/collateral-monitoring.service';
import {
  CreateLoanOfferDto,
  CreateLoanRequestDto,
  RepayLoanDto,
  LoanFilterDto,
  MarketplaceFilterDto,
  AcceptLoanMatchDto,
} from '../dto/loan.dto';
import { RequestType } from '../entities/loan-request.entity';

@ApiTags('P2P Lending')
@ApiBearerAuth()
@Controller('p2p-lending')
export class LoanController {
  constructor(
    private readonly loanService: LoanService,
    private readonly matchingService: LoanMatchingService,
    private readonly creditScoringService: CreditScoringService,
    private readonly interestRateService: InterestRateService,
    private readonly collateralService: CollateralMonitoringService,
  ) {}

  // ==================== LOAN CREATION ====================

  @Post('offers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a loan offer (lender)' })
  @ApiResponse({ status: 201, description: 'Loan offer created successfully' })
  async createOffer(@Request() req, @Body() dto: CreateLoanOfferDto) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.loanService.createLoanOffer(userId, dto);
  }

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a loan request (borrower)' })
  @ApiResponse({ status: 201, description: 'Loan request created successfully' })
  async createRequest(@Request() req, @Body() dto: CreateLoanRequestDto) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.loanService.createLoanRequest(userId, dto);
  }

  // ==================== LOAN MANAGEMENT ====================

  @Get('loans')
  @ApiOperation({ summary: 'Get user loans' })
  @ApiResponse({ status: 200, description: 'List of user loans' })
  async getUserLoans(
    @Request() req,
    @Query('role') role?: 'lender' | 'borrower',
  ) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.loanService.getUserLoans(userId, role);
  }

  @Get('loans/:id')
  @ApiOperation({ summary: 'Get loan details' })
  @ApiResponse({ status: 200, description: 'Loan details retrieved' })
  async getLoan(@Request() req, @Param('id') loanId: string) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.loanService.getLoan(loanId, userId);
  }

  @Get('loans/:id/summary')
  @ApiOperation({ summary: 'Get loan summary with calculations' })
  @ApiResponse({ status: 200, description: 'Loan summary retrieved' })
  async getLoanSummary(@Param('id') loanId: string) {
    return await this.loanService.getLoanSummary(loanId);
  }

  @Post('loans/:id/repay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Repay loan (full or partial)' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  async repayLoan(
    @Request() req,
    @Param('id') loanId: string,
    @Body() dto: Omit<RepayLoanDto, 'loanId'>,
  ) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.loanService.repayLoan(userId, { ...dto, loanId });
  }

  // ==================== MARKETPLACE ====================

  @Get('marketplace')
  @ApiOperation({ summary: 'Browse marketplace listings' })
  @ApiResponse({ status: 200, description: 'Marketplace listings retrieved' })
  async getMarketplace(@Query() filters: MarketplaceFilterDto) {
    return await this.loanService.getMarketplaceListings(
      filters.type,
      filters.currency,
      filters.page,
      filters.limit,
    );
  }

  @Get('marketplace/stats')
  @ApiOperation({ summary: 'Get marketplace statistics' })
  @ApiResponse({ status: 200, description: 'Marketplace stats retrieved' })
  async getMarketplaceStats(@Query('currency') currency?: string) {
    return await this.matchingService.getMarketplaceStats(currency);
  }

  // ==================== MATCHING ====================

  @Get('requests/:id/matches')
  @ApiOperation({ summary: 'Find potential matches for a loan request' })
  @ApiResponse({ status: 200, description: 'Potential matches found' })
  async findMatches(
    @Param('id') requestId: string,
    @Query('limit') limit: number = 10,
  ) {
    return await this.matchingService.findMatches(requestId, limit);
  }

  @Post('requests/:id/accept')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Accept a loan match' })
  @ApiResponse({ status: 201, description: 'Match accepted, loan created' })
  async acceptMatch(
    @Param('id') requestId: string,
    @Body() dto: AcceptLoanMatchDto,
  ) {
    return await this.matchingService.executeMatch(
      requestId,
      dto.matchedRequestId,
      dto.agreedInterestRate,
    );
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get user loan requests' })
  @ApiResponse({ status: 200, description: 'User loan requests retrieved' })
  async getMyRequests(@Request() req, @Query('status') status?: string) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.loanService.getUserLoanRequests(userId, status as any);
  }

  @Post('requests/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a loan request' })
  @ApiResponse({ status: 200, description: 'Request cancelled' })
  async cancelRequest(@Request() req, @Param('id') requestId: string) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.loanService.cancelLoanRequest(userId, requestId);
  }

  // ==================== CREDIT SCORE ====================

  @Get('credit-score')
  @ApiOperation({ summary: 'Get user credit score' })
  @ApiResponse({ status: 200, description: 'Credit score retrieved' })
  async getCreditScore(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    const score = await this.creditScoringService.getCreditScore(userId);
    
    if (!score) {
      // Initialize credit score for new user
      return await this.creditScoringService.initializeCreditScore(userId, new Date());
    }
    
    return score;
  }

  @Post('credit-score/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recalculate credit score' })
  @ApiResponse({ status: 200, description: 'Credit score recalculated' })
  async recalculateCreditScore(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.creditScoringService.calculateCreditScore(userId);
  }

  // ==================== INTEREST RATES ====================

  @Get('interest-rates/calculate')
  @ApiOperation({ summary: 'Calculate interest rate for given parameters' })
  @ApiResponse({ status: 200, description: 'Interest rate calculated' })
  async calculateInterestRate(
    @Query('asset') asset: string,
    @Query('ltv') ltv: number,
    @Query('duration') duration: number,
  ) {
    const userId = 'mock-user-id'; // Get from auth
    const creditScore = await this.creditScoringService.getCreditScore(userId);
    
    return await this.interestRateService.calculateInterestRate(
      asset,
      ltv,
      duration,
      creditScore || undefined,
    );
  }

  @Get('interest-rates/market/:asset')
  @ApiOperation({ summary: 'Get market statistics for an asset' })
  @ApiResponse({ status: 200, description: 'Market statistics retrieved' })
  async getMarketStats(@Param('asset') asset: string) {
    return await this.interestRateService.getMarketStatistics(asset);
  }

  // ==================== COLLATERAL MONITORING ====================

  @Get('loans/:id/collateral')
  @ApiOperation({ summary: 'Get collateral monitoring data' })
  @ApiResponse({ status: 200, description: 'Collateral data retrieved' })
  async getCollateralMonitoring(@Param('id') loanId: string) {
    return await this.collateralService.getLatestMonitoring(loanId);
  }

  @Get('loans/:id/collateral/history')
  @ApiOperation({ summary: 'Get collateral monitoring history' })
  @ApiResponse({ status: 200, description: 'Collateral history retrieved' })
  async getCollateralHistory(
    @Param('id') loanId: string,
    @Query('limit') limit: number = 100,
  ) {
    return await this.collateralService.getMonitoringHistory(loanId, limit);
  }

  @Get('at-risk-loans')
  @ApiOperation({ summary: 'Get all at-risk loans (admin)' })
  @ApiResponse({ status: 200, description: 'At-risk loans retrieved' })
  async getAtRiskLoans() {
    return await this.collateralService.getAtRiskLoans();
  }

  @Get('statistics/collateral')
  @ApiOperation({ summary: 'Get platform collateral statistics' })
  @ApiResponse({ status: 200, description: 'Collateral statistics retrieved' })
  async getCollateralStatistics() {
    return await this.collateralService.getCollateralStatistics();
  }

  // ==================== PLATFORM STATISTICS ====================

  @Get('statistics/overview')
  @ApiOperation({ summary: 'Get platform overview statistics' })
  @ApiResponse({ status: 200, description: 'Platform statistics retrieved' })
  async getPlatformStatistics() {
    const collateralStats = await this.collateralService.getCollateralStatistics();
    const marketStats = await this.matchingService.getMarketplaceStats();

    return {
      collateral: collateralStats,
      marketplace: marketStats,
    };
  }
}
