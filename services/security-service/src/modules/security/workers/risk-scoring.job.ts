import { Injectable, Logger } from '@nestjs/common';
import { TransactionMonitoringService } from '../services/transaction-monitoring.service';
import { QueueNames, QueueService } from '@exchange/common';

@Injectable()
export class RiskScoringJob {
  private readonly logger = new Logger(RiskScoringJob.name);

  constructor(
    private readonly monitoringService: TransactionMonitoringService,
    private readonly queueService: QueueService,
  ) {}


  async updateRiskScores() {
    this.logger.log('Running risk scoring job');
    
    await this.queueService.scheduleRecurringJob(
      QueueNames.SECURITY,
      'scoring-risks',
      {}, 
      '0 * * * *',
      {
        jobId: 'scoring-risks-hourly',
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
  
      },
    );
  }
}
