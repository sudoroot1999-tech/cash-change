import { Injectable, Logger } from '@nestjs/common';
import { QueueNames, QueueService } from '@exchange/common';

@Injectable()
export class WhitelistActivationJob {
  private readonly logger = new Logger(WhitelistActivationJob.name);

  constructor(
    private readonly queueService: QueueService,
  ) {}


  async scheduleWhitelistActivation() {
    this.logger.log('Scheduling whitelist activation job');

    await this.queueService.scheduleRecurringJob(
      QueueNames.SECURITY,
      'activate-whitelists',
      {},
      '*/10 * * * *',
      {
        jobId: 'activate-whitelists-10min',
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
