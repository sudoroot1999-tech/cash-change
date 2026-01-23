import { Injectable, Logger } from '@nestjs/common';
import { QueueNames, QueueService } from '@exchange/common';

@Injectable()
export class DepositMonitoringJob {
    private readonly logger = new Logger(DepositMonitoringJob.name);

    constructor(
        private readonly queueService: QueueService,
    ) { }

    async monitorEthereumDeposits() {
        this.logger.log('Running monitor ethereum deposits job');

        await this.queueService.scheduleRecurringJob(
            QueueNames.ANALYTICS,
            'monitor_ethereum_deposits',
            {},
            '0 */1 * * * *',
            {
                jobId: 'monitor_ethereum_deposits_every_minute',
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: true,

            },
        );
    }

    async monitorBitcoinDeposits() {
        this.logger.log('Running monitor bitcoin deposits job');

        await this.queueService.scheduleRecurringJob(
            QueueNames.ANALYTICS,
            'monitor_bitcoin_deposits',
            {},
            '0 */2 * * * *',
            {
                jobId: 'monitor_bitcoin_deposits_every_2minute',
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: true,

            },
        );
    }

    async monitorBSCDeposits() {
        this.logger.log('Running monitor BSC deposits job');

        await this.queueService.scheduleRecurringJob(
            QueueNames.ANALYTICS,
            'monitor_bsc_deposits',
            {},
            '0 */1 * * * *',
            {
                jobId: 'monitor_bsc_deposits_every_minute',
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: true,

            },
        );
    }

    async monitorPolygonDeposits() {
        this.logger.log('Running polygon BSC deposits job');

        await this.queueService.scheduleRecurringJob(
            QueueNames.ANALYTICS,
            'monitor_polygon_deposits',
            {},
            '0 */1 * * * *',
            {
                jobId: 'monitor_polygon_deposits_every_minute',
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: true,

            },
        );
    }

    async monitorSolanaDeposits() {
        this.logger.log('Running polygon Solana deposits job');

        await this.queueService.scheduleRecurringJob(
            QueueNames.ANALYTICS,
            'monitor_solana_deposits',
            {},
            '0 */1 * * * *',
            {
                jobId: 'monitor_solana_deposits_every_minute',
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: true,

            },
        );
    }

    async updateDepositConfirmations() {
        this.logger.log('Running update deposit confirmations job');

        await this.queueService.scheduleRecurringJob(
            QueueNames.ANALYTICS,
            'update_deposit_confirmation',
            {},
            '0 */1 * * * *',
            {
                jobId: 'update_deposit_confirmation_every_minute',
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
