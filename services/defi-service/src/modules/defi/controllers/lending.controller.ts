import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LendingService } from '../services/lending.service';
import { BorrowDto, RepayDto, LoanResponseDto, HealthFactorResponseDto } from '../dto/lending.dto';

@ApiTags('Lending & Borrowing')
@Controller('defi')
export class LendingController {
  constructor(private readonly lendingService: LendingService) {}

  @Post('borrow')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Borrow assets with collateral (crypto or NFT)' })
  @ApiResponse({ status: 201, description: 'Loan created successfully', type: LoanResponseDto })
  async borrow(@Request() req, @Body() borrowDto: BorrowDto) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.lendingService.borrow(userId, borrowDto);
  }

  @Post('repay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Repay borrowed assets' })
  @ApiResponse({ status: 200, description: 'Loan repaid successfully', type: LoanResponseDto })
  async repay(@Request() req, @Body() repayDto: RepayDto) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.lendingService.repay(userId, repayDto);
  }

  @Get('loans')
  @ApiOperation({ summary: 'Get all loans for user' })
  @ApiResponse({ status: 200, description: 'Loans retrieved successfully', type: [LoanResponseDto] })
  async getLoans(@Request() req) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.lendingService.getLoans(userId);
  }

  @Get('loans/:id')
  @ApiOperation({ summary: 'Get specific loan details' })
  @ApiResponse({ status: 200, description: 'Loan details retrieved', type: LoanResponseDto })
  async getLoan(@Request() req, @Param('id') loanId: string) {
    const userId = req.user?.id || 'mock-user-id';
    return await this.lendingService.getLoan(userId, loanId);
  }

  @Get('loans/:id/health-factor')
  @ApiOperation({ summary: 'Get loan health factor' })
  @ApiResponse({ status: 200, description: 'Health factor retrieved', type: HealthFactorResponseDto })
  async getHealthFactor(@Request() req, @Param('id') loanId: string) {
    const userId = req.user?.id || 'mock-user-id';
    const loan = await this.lendingService.getLoan(userId, loanId);
    
    return {
      loanId: loan.id,
      healthFactor: loan.healthFactor,
      isHealthy: parseFloat(loan.healthFactor) >= 1.1,
      liquidationThreshold: loan.liquidationThreshold,
      collateralValueUsd: loan.collateralValueUsd,
      borrowedValueUsd: loan.collateralValueUsd, // Mock
    };
  }

  @Post('loans/:id/liquidate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liquidate an unhealthy loan' })
  @ApiResponse({ status: 200, description: 'Loan liquidated successfully' })
  async liquidateLoan(@Request() req, @Param('id') loanId: string) {
    const liquidatorUserId = req.user?.id || 'mock-liquidator-id';
    return await this.lendingService.liquidateLoan(loanId, liquidatorUserId);
  }
}
