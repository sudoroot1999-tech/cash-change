import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LoansService } from './loans.service';

@ApiTags('NFT Loans')
@Controller('nft/loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request loan with NFT as collateral' })
  async requestLoan(@Body() data: any) {
    return await this.loansService.requestLoan(data);
  }

  @Post(':loanId/accept')
  @ApiOperation({ summary: 'Accept loan offer' })
  async acceptLoan(@Param('loanId') loanId: string, @Body() data: any) {
    return await this.loansService.acceptLoan(loanId, data.lenderAddress);
  }

  @Post(':loanId/repay')
  @ApiOperation({ summary: 'Repay loan' })
  async repayLoan(@Param('loanId') loanId: string) {
    return await this.loansService.repayLoan(loanId);
  }

  @Post(':loanId/liquidate')
  @ApiOperation({ summary: 'Liquidate defaulted loan' })
  async liquidateLoan(@Param('loanId') loanId: string) {
    return await this.loansService.liquidateLoan(loanId);
  }

  @Get('my-loans')
  @ApiOperation({ summary: 'Get user loans' })
  async getUserLoans(@Query('userAddress') userAddress: string) {
    return await this.loansService.getUserLoans(userAddress);
  }
}
