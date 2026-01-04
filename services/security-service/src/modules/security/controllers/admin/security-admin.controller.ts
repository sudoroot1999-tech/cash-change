import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TransactionMonitoringService } from '../../services/transaction-monitoring.service';
import { IncidentResponseService } from '../../services/incident-response.service';
import { ProofOfReservesService } from '../../services/proof-of-reserves.service';
import { InsuranceFundService } from '../../services/insurance-fund.service';
import { ColdWalletService } from '../../services/cold-wallet.service';
import { BugBountyService } from '../../services/bug-bounty.service';
import { CreateIncidentDto } from '../../dto/incident.dto';
import { BugBountyStatus } from '../../entities/bug-bounty.entity';
import { IncidentStatus } from '../../entities/incident.entity';

@Controller('admin/security')
export class SecurityAdminController {
  constructor(
    private readonly monitoringService: TransactionMonitoringService,
    private readonly incidentService: IncidentResponseService,
    private readonly reservesService: ProofOfReservesService,
    private readonly insuranceService: InsuranceFundService,
    private readonly coldWalletService: ColdWalletService,
    private readonly bugBountyService: BugBountyService,
  ) {}

  @Get('dashboard')
  async getDashboard() {
    const activeIncidents = await this.incidentService.getActiveIncidents();
    const insuranceBalances = await this.insuranceService.getAllBalances();
    const bugBountyStats = await this.bugBountyService.getStatistics();

    return {
      success: true,
      data: {
        activeIncidents: activeIncidents.length,
        insuranceFund: insuranceBalances,
        bugBountyStats,
      },
    };
  }

  @Post('incidents')
  async createIncident(@Body() dto: CreateIncidentDto) {
    const incident = await this.incidentService.createIncident(dto);
    return { success: true, data: incident };
  }

  @Get('incidents')
  async getIncidents() {
    const incidents = await this.incidentService.getActiveIncidents();
    return { success: true, data: incidents };
  }

  @Put('incidents/:incidentId/status')
  async updateIncidentStatus(
    @Param('incidentId') incidentId: string,
    @Body() body: { status: IncidentStatus; performedBy: string },
  ) {
    const incident = await this.incidentService.updateStatus(
      incidentId,
      body.status,
      body.performedBy,
    );
    return { success: true, data: incident };
  }

  @Get('risk-scores')
  async getRiskScores(@Query('userId') userId?: string) {
    if (userId) {
      const score = await this.monitoringService.getUserRiskScore(userId);
      return { success: true, data: score };
    }
    return { success: true, data: [] };
  }

  @Get('proof-of-reserves/:currency')
  async getProofOfReserves(@Param('currency') currency: string) {
    const proof = await this.reservesService.getLatestProof(currency);
    const audit = await this.reservesService.generateAuditReport(currency);
    return { success: true, data: { proof, audit } };
  }

  @Get('cold-wallets')
  async getColdWallets(@Query('currency') currency?: string) {
    const wallets = await this.coldWalletService.getAllColdWallets(currency);
    return { success: true, data: wallets };
  }

  @Get('insurance-fund/:currency')
  async getInsuranceFund(@Param('currency') currency: string) {
    const report = await this.insuranceService.generateReport(currency);
    return { success: true, data: report };
  }

  @Get('bug-bounty/submissions')
  async getBugBountySubmissions(@Query('status') status?: BugBountyStatus) {
    const submissions = await this.bugBountyService.getAllSubmissions({ status });
    return { success: true, data: submissions };
  }

  @Put('bug-bounty/:submissionId/status')
  async updateBugBountyStatus(
    @Param('submissionId') submissionId: string,
    @Body() body: { status: BugBountyStatus; notes?: string },
  ) {
    const submission = await this.bugBountyService.updateStatus(
      submissionId,
      body.status,
      body.notes,
    );
    return { success: true, data: submission };
  }

  @Post('bug-bounty/:submissionId/reward')
  async awardBounty(
    @Param('submissionId') submissionId: string,
    @Body() body: { amount: number; currency: string },
  ) {
    const submission = await this.bugBountyService.awardBounty(
      submissionId,
      body.amount,
      body.currency,
    );
    return { success: true, data: submission };
  }

  @Post('circuit-breaker/pause-withdrawals')
  async pauseWithdrawals() {
    await this.incidentService.pauseWithdrawals();
    return { success: true, message: 'Withdrawals paused' };
  }

  @Post('circuit-breaker/resume-withdrawals')
  async resumeWithdrawals() {
    await this.incidentService.resumeWithdrawals();
    return { success: true, message: 'Withdrawals resumed' };
  }
}
