import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BugBountySubmission
} from '../entities/bug-bounty.entity';
import { BUG_SEVERITY, BUGBOUNTY_STATUS, BugBountyStatus, BugSeverity } from '@exchange/common';

export interface CreateBugBountyDto {
  reporterId: string;
  reporterEmail: string;
  reporterName?: string;
  title: string;
  description: string;
  severity: BugSeverity;
  pocUrl?: string;
  attachments?: string[];
}

@Injectable()
export class BugBountyService {
  private readonly logger = new Logger(BugBountyService.name);

  // Reward tiers based on severity
  private readonly REWARD_TIERS = {
    [BUG_SEVERITY.CRITICAL]: { min: 5000, max: 50000 },
    [BUG_SEVERITY.HIGH]: { min: 2000, max: 10000 },
    [BUG_SEVERITY.MEDIUM]: { min: 500, max: 2000 },
    [BUG_SEVERITY.LOW]: { min: 100, max: 500 },
    [BUG_SEVERITY.INFO]: { min: 0, max: 100 },
  };

  constructor(
    @InjectRepository(BugBountySubmission)
    private submissionRepository: Repository<BugBountySubmission>,
  ) {}

  /**
   * Submit bug bounty report
   */
  async submitReport(data: CreateBugBountyDto): Promise<BugBountySubmission> {
    const submission = this.submissionRepository.create({
      ...data,
      status: BUGBOUNTY_STATUS.SUBMITTED,
    });

    await this.submissionRepository.save(submission);
    this.logger.log(`Bug bounty submitted: ${submission.title} by ${data.reporterEmail}`);
    
    return submission;
  }

  /**
   * Update submission status
   */
  async updateStatus(
    submissionId: string,
    status: BugBountyStatus,
    internalNotes?: string,
  ): Promise<BugBountySubmission> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new BadRequestException('Submission not found');
    }

    submission.status = status;
    
    if (internalNotes) {
      submission.internalNotes = internalNotes;
    }

    if (status === BUGBOUNTY_STATUS.RESOLVED) {
      submission.resolvedAt = new Date();
    }

    await this.submissionRepository.save(submission);
    this.logger.log(`Bug bounty status updated: ${submissionId} -> ${status}`);
    
    return submission;
  }

  /**
   * Award bounty
   */
  async awardBounty(
    submissionId: string,
    rewardAmount: number,
    rewardCurrency: string = 'USD',
  ): Promise<BugBountySubmission> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new BadRequestException('Submission not found');
    }

    // Validate reward amount based on severity
    const tier = this.REWARD_TIERS[submission.severity];
    if (rewardAmount < tier.min || rewardAmount > tier.max) {
      this.logger.warn(
        `Reward amount ${rewardAmount} outside recommended range for ${submission.severity}`,
      );
    }

    submission.rewardAmount = rewardAmount;
    submission.rewardCurrency = rewardCurrency;
    submission.rewardedAt = new Date();
    submission.status = BUGBOUNTY_STATUS.REWARDED;

    await this.submissionRepository.save(submission);
    this.logger.log(
      `Bug bounty rewarded: ${submissionId} - ${rewardAmount} ${rewardCurrency}`,
    );
    
    return submission;
  }

  /**
   * Get submission by ID
   */
  async getSubmission(submissionId: string): Promise<BugBountySubmission | null> {
    return await this.submissionRepository.findOne({
      where: { id: submissionId },
    });
  }

  /**
   * Get all submissions
   */
  async getAllSubmissions(filters?: {
    status?: BugBountyStatus;
    severity?: BugSeverity;
    reporterId?: string;
  }): Promise<BugBountySubmission[]> {
    const where: any = {};
    
    if (filters?.status) where.status = filters.status;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.reporterId) where.reporterId = filters.reporterId;

    return await this.submissionRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get submissions by reporter
   */
  async getReporterSubmissions(reporterId: string): Promise<BugBountySubmission[]> {
    return await this.submissionRepository.find({
      where: { reporterId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get hall of fame (top reporters)
   */
  async getHallOfFame(limit: number = 20): Promise<any[]> {
    const submissions = await this.submissionRepository.find({
      where: { status: BUGBOUNTY_STATUS.REWARDED },
    });

    // Group by reporter
    const reporterStats: Record<string, any> = {};

    submissions.forEach(submission => {
      const key = submission.reporterEmail;
      
      if (!reporterStats[key]) {
        reporterStats[key] = {
          reporterId: submission.reporterId,
          reporterEmail: submission.reporterEmail,
          reporterName: submission.reporterName || 'Anonymous',
          totalReports: 0,
          totalReward: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
        };
      }

      reporterStats[key].totalReports++;
      reporterStats[key].totalReward += submission.rewardAmount || 0;

      switch (submission.severity) {
        case BUG_SEVERITY.CRITICAL:
          reporterStats[key].criticalCount++;
          break;
        case BUG_SEVERITY.HIGH:
          reporterStats[key].highCount++;
          break;
        case BUG_SEVERITY.MEDIUM:
          reporterStats[key].mediumCount++;
          break;
        case BUG_SEVERITY.LOW:
          reporterStats[key].lowCount++;
          break;
      }
    });

    // Sort by total reward and return top reporters
    return Object.values(reporterStats)
      .sort((a, b) => b.totalReward - a.totalReward)
      .slice(0, limit);
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<any> {
    const allSubmissions = await this.submissionRepository.find();

    const stats = {
      total: allSubmissions.length,
      byStatus: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      totalRewardsUSD: 0,
      averageReward: 0,
      averageResolutionTime: 0,
    };

    // Count by status
    Object.values(BUGBOUNTY_STATUS).forEach(status => {
      stats.byStatus[status] = allSubmissions.filter(s => s.status === status).length;
    });

    // Count by severity
    Object.values(BUG_SEVERITY).forEach(severity => {
      stats.bySeverity[severity] = allSubmissions.filter(s => s.severity === severity).length;
    });

    // Calculate rewards
    const rewardedSubmissions = allSubmissions.filter(
      s => s.rewardAmount && s.rewardCurrency === 'USD',
    );
    
    stats.totalRewardsUSD = rewardedSubmissions.reduce(
      (sum, s) => sum + (s.rewardAmount || 0),
      0,
    );
    
    stats.averageReward = rewardedSubmissions.length > 0
      ? stats.totalRewardsUSD / rewardedSubmissions.length
      : 0;

    // Calculate average resolution time
    const resolvedSubmissions = allSubmissions.filter(
      s => s.resolvedAt,
    );

    if (resolvedSubmissions.length > 0) {
      const totalResolutionTime = resolvedSubmissions.reduce((sum, s) => {
        const created = new Date(s.createdAt).getTime();
        const resolved = new Date(s.resolvedAt!).getTime();
        return sum + (resolved - created);
      }, 0);

      stats.averageResolutionTime = totalResolutionTime / resolvedSubmissions.length;
    }

    return stats;
  }

  /**
   * Get recommended reward for severity
   */
  getRecommendedReward(severity: BugSeverity): { min: number; max: number } {
    return this.REWARD_TIERS[severity];
  }

  /**
   * Generate responsible disclosure policy
   */
  getResponsibleDisclosurePolicy(): string {
    return `
# Responsible Disclosure Policy

## Scope
This bug bounty program covers vulnerabilities in:
- Web application
- Mobile applications
- API endpoints
- Smart contracts
- Infrastructure

## Rules
1. Do not access or modify user data without permission
2. Do not perform DoS/DDoS attacks
3. Do not spam or social engineer our staff
4. Give us reasonable time to fix the issue before public disclosure
5. Do not exploit the vulnerability beyond what is necessary to prove the bug

## Rewards
- Critical: $5,000 - $50,000
- High: $2,000 - $10,000
- Medium: $500 - $2,000
- Low: $100 - $500
- Informational: $0 - $100

## Safe Harbor
We will not pursue legal action against researchers who:
- Follow this policy
- Report vulnerabilities promptly
- Do not exploit vulnerabilities beyond proof of concept

## How to Submit
Email: security@cryptoexchange.com
PGP Key: [Key ID]
    `.trim();
  }
}
