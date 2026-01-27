import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TradeService } from './trade.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private tradeService: TradeService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredTrades() {
    this.logger.log('Checking for expired trades...');
    
    try {
      await this.tradeService.processExpiredTrades();
      this.logger.log('Expired trades processed successfully');
    } catch (error) {
      this.logger.error('Failed to process expired trades:', error);
    }
  }

  // Run every 5 minutes
  @Cron('*/5 * * * *')
  async cleanupOldData() {
    this.logger.log('Running cleanup tasks...');
    // Add any cleanup logic here
  }
}
