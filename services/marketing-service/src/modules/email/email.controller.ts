import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query 
} from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailCampaign } from '../../entities/EmailCampaign.entity';

@Controller('marketing/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('campaigns')
  async createCampaign(@Body() data: Partial<EmailCampaign>) {
    return this.emailService.createCampaign(data);
  }

  @Put('campaigns/:id')
  async updateCampaign(
    @Param('id') id: string,
    @Body() data: Partial<EmailCampaign>
  ) {
    return this.emailService.updateCampaign(id, data);
  }

  @Post('campaigns/:id/schedule')
  async scheduleCampaign(
    @Param('id') id: string,
    @Body('scheduledAt') scheduledAt: Date
  ) {
    return this.emailService.scheduleCampaign(id, scheduledAt);
  }

  @Post('campaigns/:id/send')
  async sendCampaign(
    @Param('id') id: string,
    @Body('userProvider') userProvider: any
  ) {
    await this.emailService.sendCampaign(id, userProvider);
    return { success: true, message: 'Campaign sent' };
  }

  @Post('campaigns/:id/pause')
  async pauseCampaign(@Param('id') id: string) {
    return this.emailService.pauseCampaign(id);
  }

  @Post('campaigns/:id/cancel')
  async cancelCampaign(@Param('id') id: string) {
    return this.emailService.cancelCampaign(id);
  }

  @Get('campaigns/:id/analytics')
  async getCampaignAnalytics(@Param('id') id: string) {
    return this.emailService.getCampaignAnalytics(id);
  }

  @Get('performance/by-segment')
  async getEmailPerformanceBySegment() {
    return this.emailService.getEmailPerformanceBySegment();
  }

  // Automated Emails
  @Post('send-welcome')
  async sendWelcomeEmail(
    @Body('userId') userId: string,
    @Body('userEmail') userEmail: string,
    @Body('userName') userName: string
  ) {
    await this.emailService.sendWelcomeEmail(userId, userEmail, userName);
    return { success: true };
  }

  @Post('send-onboarding')
  async sendOnboardingSequence(
    @Body('userId') userId: string,
    @Body('userEmail') userEmail: string
  ) {
    await this.emailService.sendOnboardingSequence(userId, userEmail);
    return { success: true };
  }

  @Post('send-reengagement')
  async sendReEngagementEmail(
    @Body('userId') userId: string,
    @Body('userEmail') userEmail: string,
    @Body('daysSinceLastLogin') daysSinceLastLogin: number
  ) {
    await this.emailService.sendReEngagementEmail(userId, userEmail, daysSinceLastLogin);
    return { success: true };
  }

  // Webhooks
  @Post('webhooks/opened')
  async handleEmailOpened(@Body() data: any) {
    await this.emailService.handleEmailOpened(
      data.providerMessageId,
      data.ipAddress,
      data.userAgent
    );
    return { success: true };
  }

  @Post('webhooks/clicked')
  async handleEmailClicked(@Body() data: any) {
    await this.emailService.handleEmailClicked(
      data.providerMessageId,
      data.clickedLink,
      data.ipAddress,
      data.userAgent
    );
    return { success: true };
  }

  @Post('webhooks/bounced')
  async handleEmailBounced(@Body() data: any) {
    await this.emailService.handleEmailBounced(
      data.providerMessageId,
      data.bounceType,
      data.bounceReason
    );
    return { success: true };
  }

  @Post('webhooks/unsubscribed')
  async handleEmailUnsubscribed(@Body() data: any) {
    await this.emailService.handleEmailUnsubscribed(data.providerMessageId);
    return { success: true };
  }
}
