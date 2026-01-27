import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import sgMail from '@sendgrid/mail';
import * as Handlebars from 'handlebars';
import { 
  EmailCampaign, 
  CampaignStatus,
  CampaignType,
  TriggerType 
} from '../../entities/EmailCampaign.entity';
import { EmailLog, EmailStatus } from '../../entities/EmailLog.entity';
import { UserSegment } from '../../entities/UserSegment.entity';

@Injectable()
export class EmailService {
  constructor(
    @InjectRepository(EmailCampaign)
    private campaignRepo: Repository<EmailCampaign>,
    @InjectRepository(EmailLog)
    private logRepo: Repository<EmailLog>,
    @InjectRepository(UserSegment)
    private segmentRepo: Repository<UserSegment>,
  ) {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  // Campaign Management
  async createCampaign(data: Partial<EmailCampaign>): Promise<EmailCampaign> {
    const campaign = this.campaignRepo.create(data);
    return this.campaignRepo.save(campaign);
  }

  async updateCampaign(id: string, data: Partial<EmailCampaign>): Promise<EmailCampaign> {
    await this.campaignRepo.update(id, data);
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async scheduleCampaign(id: string, scheduledAt: Date): Promise<EmailCampaign> {
    return this.updateCampaign(id, {
      status: CampaignStatus.SCHEDULED,
      scheduledAt,
    });
  }

  async pauseCampaign(id: string): Promise<EmailCampaign> {
    return this.updateCampaign(id, { status: CampaignStatus.PAUSED });
  }

  async cancelCampaign(id: string): Promise<EmailCampaign> {
    return this.updateCampaign(id, { status: CampaignStatus.CANCELLED });
  }

  // Send Campaign
  async sendCampaign(campaignId: string, userProvider: any): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException('Campaign cannot be sent in current status');
    }

    // Mark as sending
    await this.campaignRepo.update(campaignId, { status: CampaignStatus.SENDING });

    // Get target users
    const targetUsers = await this.getTargetUsers(campaign, userProvider);

    // Handle A/B testing
    if (campaign.isAbTest && campaign.abTestConfig) {
      await this.sendAbTestCampaign(campaign, targetUsers);
    } else {
      await this.sendRegularCampaign(campaign, targetUsers);
    }

    // Update campaign status
    await this.campaignRepo.update(campaignId, {
      status: CampaignStatus.SENT,
      sentAt: new Date(),
      totalRecipients: targetUsers.length,
    });
  }

  private async getTargetUsers(campaign: EmailCampaign, userProvider: any): Promise<any[]> {
    let users: any[] = [];

    if (campaign.segmentId) {
      const segment = await this.segmentRepo.findOne({ where: { id: campaign.segmentId } });
      if (segment) {
        // Get users matching segment criteria
        users = await this.getUsersBySegment(segment, userProvider);
      }
    } else if (campaign.targetCriteria) {
      // Get users matching campaign-specific criteria
      users = await this.getUsersByCriteria(campaign.targetCriteria, userProvider);
    }

    return users;
  }

  private async getUsersBySegment(segment: UserSegment, userProvider: any): Promise<any[]> {
    // This would integrate with your user service
    // Use segment.criteria to build query
    return [];
  }

  private async getUsersByCriteria(criteria: any, userProvider: any): Promise<any[]> {
    // Build query based on criteria
    return [];
  }

  private async sendRegularCampaign(campaign: EmailCampaign, users: any[]): Promise<void> {
    for (const user of users) {
      try {
        const personalizedContent = this.personalizeContent(
          campaign.htmlContent,
          user,
          campaign.templateVariables
        );

        const personalizedSubject = this.personalizeContent(
          campaign.subject,
          user,
          campaign.templateVariables
        );

        await this.sendEmail(
          user.email,
          campaign.fromEmail,
          campaign.fromName,
          personalizedSubject,
          personalizedContent,
          campaign.textContent
        );

        // Log the email
        await this.logEmail(campaign.id, user.id, user.email, personalizedSubject, EmailStatus.SENT);

        // Update campaign stats
        await this.campaignRepo.increment({ id: campaign.id }, 'sent', 1);
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
        await this.logEmail(
          campaign.id,
          user.id,
          user.email,
          campaign.subject,
          EmailStatus.FAILED,
          error.message
        );
      }
    }
  }

  private async sendAbTestCampaign(campaign: EmailCampaign, users: any[]): Promise<void> {
    const variants = campaign.abTestConfig.variants;
    
    // Distribute users across variants
    const usersByVariant: Map<string, any[]> = new Map();
    variants.forEach(v => usersByVariant.set(v.id, []));

    users.forEach((user, index) => {
      let cumulativePercentage = 0;
      const randomValue = Math.random() * 100;

      for (const variant of variants) {
        cumulativePercentage += variant.percentage;
        if (randomValue <= cumulativePercentage) {
          usersByVariant.get(variant.id)?.push(user);
          break;
        }
      }
    });

    // Send each variant
    for (const variant of variants) {
      const variantUsers = usersByVariant.get(variant.id) || [];
      
      for (const user of variantUsers) {
        try {
          const subject = variant.subject || campaign.subject;
          const htmlContent = variant.htmlContent || campaign.htmlContent;

          const personalizedContent = this.personalizeContent(htmlContent, user, campaign.templateVariables);
          const personalizedSubject = this.personalizeContent(subject, user, campaign.templateVariables);

          await this.sendEmail(
            user.email,
            campaign.fromEmail,
            campaign.fromName,
            personalizedSubject,
            personalizedContent,
            campaign.textContent
          );

          await this.logEmail(
            campaign.id,
            user.id,
            user.email,
            personalizedSubject,
            EmailStatus.SENT,
            undefined,
            variant.id
          );

          await this.campaignRepo.increment({ id: campaign.id }, 'sent', 1);
        } catch (error) {
          console.error(`Failed to send A/B test email to ${user.email}:`, error);
        }
      }
    }
  }

  private personalizeContent(content: string, user: any, variables: any = {}): string {
    const template = Handlebars.compile(content);
    return template({
      user,
      ...variables,
    });
  }

  private async sendEmail(
    to: string,
    from: string,
    fromName: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<void> {
    const msg = {
      to,
      from: {
        email: from,
        name: fromName,
      },
      subject,
      html,
      text: text || '',
    };

    await sgMail.send(msg);
  }

  private async logEmail(
    campaignId: string,
    userId: string,
    recipientEmail: string,
    subject: string,
    status: EmailStatus,
    errorMessage?: string,
    abTestVariant?: string
  ): Promise<EmailLog> {
    const log = this.logRepo.create({
      campaignId,
      userId,
      recipientEmail,
      subject,
      status,
      errorMessage,
      abTestVariant,
      sentAt: status === EmailStatus.SENT ? new Date() : undefined,
    });

    return this.logRepo.save(log);
  }

  // Automated Email Sequences
  async sendWelcomeEmail(userId: string, userEmail: string, userName: string): Promise<void> {
    const welcomeCampaign = await this.campaignRepo.findOne({
      where: { type: CampaignType.WELCOME, status: CampaignStatus.SENT }
    });

    if (!welcomeCampaign) return;

    const personalizedContent = this.personalizeContent(
      welcomeCampaign.htmlContent,
      { name: userName, email: userEmail },
      welcomeCampaign.templateVariables
    );

    await this.sendEmail(
      userEmail,
      welcomeCampaign.fromEmail,
      welcomeCampaign.fromName,
      welcomeCampaign.subject,
      personalizedContent,
      welcomeCampaign.textContent
    );

    await this.logEmail(welcomeCampaign.id, userId, userEmail, welcomeCampaign.subject, EmailStatus.SENT);
  }

  async sendOnboardingSequence(userId: string, userEmail: string): Promise<void> {
    const onboardingCampaigns = await this.campaignRepo.find({
      where: { type: CampaignType.ONBOARDING },
      order: { createdAt: 'ASC' }
    });

    for (const [index, campaign] of onboardingCampaigns.entries()) {
      if (!campaign.automationRules?.delayMinutes) continue;

      // Schedule emails with delays
      setTimeout(async () => {
        try {
          const personalizedContent = this.personalizeContent(
            campaign.htmlContent,
            { email: userEmail },
            campaign.templateVariables
          );

          await this.sendEmail(
            userEmail,
            campaign.fromEmail,
            campaign.fromName,
            campaign.subject,
            personalizedContent,
            campaign.textContent
          );

          await this.logEmail(campaign.id, userId, userEmail, campaign.subject, EmailStatus.SENT);
        } catch (error) {
          console.error(`Failed to send onboarding email ${index}:`, error);
        }
      }, campaign.automationRules.delayMinutes * 60 * 1000);
    }
  }

  async sendReEngagementEmail(userId: string, userEmail: string, daysSinceLastLogin: number): Promise<void> {
    const reEngagementCampaign = await this.campaignRepo.findOne({
      where: { type: CampaignType.RE_ENGAGEMENT, status: CampaignStatus.SENT }
    });

    if (!reEngagementCampaign) return;

    const personalizedContent = this.personalizeContent(
      reEngagementCampaign.htmlContent,
      { email: userEmail, daysSinceLastLogin },
      reEngagementCampaign.templateVariables
    );

    await this.sendEmail(
      userEmail,
      reEngagementCampaign.fromEmail,
      reEngagementCampaign.fromName,
      reEngagementCampaign.subject,
      personalizedContent,
      reEngagementCampaign.textContent
    );

    await this.logEmail(reEngagementCampaign.id, userId, userEmail, reEngagementCampaign.subject, EmailStatus.SENT);
  }

  // Email Events (Webhooks from SendGrid)
  async handleEmailOpened(
    providerMessageId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const log = await this.logRepo.findOne({ where: { providerMessageId } });
    if (!log) return;

    if (log.status === EmailStatus.SENT || log.status === EmailStatus.DELIVERED) {
      await this.logRepo.update(log.id, {
        status: EmailStatus.OPENED,
        openedAt: new Date(),
        openCount: log.openCount + 1,
        ipAddress,
        userAgent,
      });

      // Update campaign stats
      if (log.openCount === 0) {
        await this.campaignRepo.increment({ id: log.campaignId }, 'opened', 1);
        await this.updateCampaignRates(log.campaignId);
      }
    }
  }

  async handleEmailClicked(
    providerMessageId: string,
    clickedLink: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const log = await this.logRepo.findOne({ where: { providerMessageId } });
    if (!log) return;

    const clickedLinks = log.clickedLinks || [];
    if (!clickedLinks.includes(clickedLink)) {
      clickedLinks.push(clickedLink);
    }

    await this.logRepo.update(log.id, {
      status: EmailStatus.CLICKED,
      firstClickedAt: log.firstClickedAt || new Date(),
      clickCount: log.clickCount + 1,
      clickedLinks,
      ipAddress,
      userAgent,
    });

    // Update campaign stats
    if (log.clickCount === 0) {
      await this.campaignRepo.increment({ id: log.campaignId }, 'clicked', 1);
      await this.updateCampaignRates(log.campaignId);
    }
  }

  async handleEmailBounced(
    providerMessageId: string,
    bounceType: string,
    bounceReason: string
  ): Promise<void> {
    const log = await this.logRepo.findOne({ where: { providerMessageId } });
    if (!log) return;

    await this.logRepo.update(log.id, {
      status: EmailStatus.BOUNCED,
      bounceType,
      bounceReason,
    });

    await this.campaignRepo.increment({ id: log.campaignId }, 'bounced', 1);
    await this.updateCampaignRates(log.campaignId);
  }

  async handleEmailUnsubscribed(providerMessageId: string): Promise<void> {
    const log = await this.logRepo.findOne({ where: { providerMessageId } });
    if (!log) return;

    await this.logRepo.update(log.id, {
      status: EmailStatus.UNSUBSCRIBED,
    });

    await this.campaignRepo.increment({ id: log.campaignId }, 'unsubscribed', 1);
  }

  private async updateCampaignRates(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) return;

    const delivered = campaign.sent - campaign.bounced;
    const openRate = delivered > 0 ? (campaign.opened / delivered) * 100 : 0;
    const clickRate = campaign.opened > 0 ? (campaign.clicked / campaign.opened) * 100 : 0;

    await this.campaignRepo.update(campaignId, {
      delivered,
      openRate,
      clickRate,
    });
  }

  // Campaign Analytics
  async getCampaignAnalytics(campaignId: string): Promise<any> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const logs = await this.logRepo.find({ where: { campaignId } });

    return {
      campaign,
      totalRecipients: campaign.totalRecipients,
      sent: campaign.sent,
      delivered: campaign.delivered,
      opened: campaign.opened,
      clicked: campaign.clicked,
      bounced: campaign.bounced,
      unsubscribed: campaign.unsubscribed,
      openRate: campaign.openRate,
      clickRate: campaign.clickRate,
      conversionRate: campaign.conversionRate,
      recentLogs: logs.slice(0, 20),
    };
  }

  async getEmailPerformanceBySegment(): Promise<any[]> {
    // Group performance by segment
    return this.campaignRepo
      .createQueryBuilder('campaign')
      .select('campaign.segmentId', 'segmentId')
      .addSelect('AVG(campaign.openRate)', 'avgOpenRate')
      .addSelect('AVG(campaign.clickRate)', 'avgClickRate')
      .addSelect('COUNT(campaign.id)', 'totalCampaigns')
      .where('campaign.segmentId IS NOT NULL')
      .groupBy('campaign.segmentId')
      .getRawMany();
  }
}
