import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { QueueService } from "@exchange/common";
import { QueueNames } from "@exchange/common";
import { DepositMonitorService } from "../services/deposit-monitor.service";

@Injectable()
export class WalletsWorker implements OnModuleInit {
    private readonly logger = new Logger(WalletsWorker.name);

    constructor(
        private readonly queueService: QueueService,
        private readonly depositMonitoringService: DepositMonitorService,
    ) { }

    onModuleInit() {
        this.queueService.createWorker(
            QueueNames.ANALYTICS,
            async (job) => {
                this.logger.log(`Processing job ${job.name} (${job.id})`);

                switch (job.name) {
                    case 'monitor_ethereum_deposits':
                        await this.depositMonitoringService.monitorEthereumDeposits();
                        break;

                    case 'monitor_bitcoin_deposits':
                        await this.depositMonitoringService.monitorBitcoinDeposits();
                        break;

                    case 'monitor_bsc_deposits':
                        await this.depositMonitoringService.monitorBSCDeposits();
                        break;

                    case 'monitor_polygon_deposits':
                        await this.depositMonitoringService.monitorPolygonDeposits();
                        break;

                    case 'monitor_solana_deposits':
                        await this.depositMonitoringService.monitorSolanaDeposits();
                        break;

                    case 'update_deposit_confirmation':
                        await this.depositMonitoringService.updateDepositConfirmations();
                        break;

                    default:
                        this.logger.warn(`Unknown job: ${job.name}`);
                }
            },
            {
                concurrency: 3,
            },
        );
    }
}
