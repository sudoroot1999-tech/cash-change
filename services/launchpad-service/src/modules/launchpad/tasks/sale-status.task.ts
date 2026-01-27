import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SaleRoundService } from '../services/sale-round.service';

@Injectable()
export class SaleStatusTask {
  private readonly logger = new Logger(SaleStatusTask.name);

  constructor(private readonly saleRoundService: SaleRoundService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async updateSaleStatuses() {
    try {
      this.logger.debug('Checking and updating sale round statuses...');
      await this.saleRoundService.checkAndUpdateStatuses();
      this.logger.debug('Sale round statuses updated successfully');
    } catch (error) {
      this.logger.error('Failed to update sale round statuses', error);
    }
  }
}
