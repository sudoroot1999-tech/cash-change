import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { QueueService } from "@exchange/common";
import { QueueNames } from "@exchange/common";
import { WithdrawalWhitelistService } from "../services/withdrawal-whitelist.service";
import { TransactionMonitoringService } from "../services/transaction-monitoring.service";

@Injectable()
export class SecurityWorker implements OnModuleInit {
  private readonly logger = new Logger(SecurityWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly whitelistService: WithdrawalWhitelistService,
    private readonly monitoringService: TransactionMonitoringService,
  ) {}

  onModuleInit() {
    this.queueService.createWorker(
      QueueNames.SECURITY,
      async (job) => {
        this.logger.log(`Processing job ${job.name} (${job.id})`);

        switch (job.name) {
          case 'activate-whitelists':
            await this.whitelistService.activatePendingWhitelists();
            break;

          case 'scoring-risks':
            await this.monitoringService.calculateRiskScore(job.data);
            break;

          default:
            this.logger.warn(`Unknown job: ${job.name}`);
        }
      },
      {
        concurrency: 2,
      },
    );
  }
}
