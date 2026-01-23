import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { BugBountyService } from '../services/bug-bounty.service';
import { SubmitBugBountyDto } from '../dto/bug-bounty.dto';
import { RequireAuth } from '@exchange/common';

@Controller('security/bug-bounty')
@RequireAuth()
export class BugBountyController {
  constructor(private readonly bugBountyService: BugBountyService) {}

  @Post('submit')
  async submitReport(@Body() dto: SubmitBugBountyDto) {
    const reporterId = dto.reporterEmail; // Use email as reporter ID for public submissions
    
    const submission = await this.bugBountyService.submitReport({
      ...dto,
      reporterId,
    });

    return {
      success: true,
      message: 'Thank you for your submission. We will review it shortly.',
      data: {
        submissionId: submission.id,
        status: submission.status,
      },
    };
  }

  @Get('policy')
  getPolicy() {
    const policy = this.bugBountyService.getResponsibleDisclosurePolicy();
    
    return {
      success: true,
      data: { policy },
    };
  }

  @Get('hall-of-fame')
  async getHallOfFame(@Query('limit') limit?: string) {
    const hallOfFame = await this.bugBountyService.getHallOfFame(
      limit ? parseInt(limit) : 20,
    );

    return {
      success: true,
      data: hallOfFame,
    };
  }

  @Get('statistics')
  async getStatistics() {
    const stats = await this.bugBountyService.getStatistics();

    return {
      success: true,
      data: stats,
    };
  }
}
