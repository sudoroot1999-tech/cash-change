import cron from 'node-cron';
import { TradingETL } from './trading-etl';
import { UserETL } from './user-etl';
import { RevenueETL } from './revenue-etl';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

export class ETLRunner {
  private tradingETL: TradingETL;
  private userETL: UserETL;
  private revenueETL: RevenueETL;
  private isRunning: boolean = false;

  constructor() {
    this.tradingETL = new TradingETL();
    this.userETL = new UserETL();
    this.revenueETL = new RevenueETL();
  }

  async runAll(): Promise<void> {
    if (this.isRunning) {
      logger.warn('ETL is already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting full ETL pipeline');

      // Run all ETL processes
      await Promise.all([
        this.tradingETL.runFullETL(),
        this.userETL.runFullETL(),
        this.revenueETL.runFullETL(),
      ]);

      const duration = Date.now() - startTime;
      logger.info(`Full ETL pipeline completed in ${duration}ms`);
    } catch (error) {
      logger.error('ETL pipeline failed', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async runTradingETL(): Promise<void> {
    try {
      logger.info('Running trading ETL');
      await this.tradingETL.runFullETL();
      logger.info('Trading ETL completed');
    } catch (error) {
      logger.error('Trading ETL failed', error);
      throw error;
    }
  }

  async runUserETL(): Promise<void> {
    try {
      logger.info('Running user ETL');
      await this.userETL.runFullETL();
      logger.info('User ETL completed');
    } catch (error) {
      logger.error('User ETL failed', error);
      throw error;
    }
  }

  async runRevenueETL(): Promise<void> {
    try {
      logger.info('Running revenue ETL');
      await this.revenueETL.runFullETL();
      logger.info('Revenue ETL completed');
    } catch (error) {
      logger.error('Revenue ETL failed', error);
      throw error;
    }
  }

  startScheduledETL(): void {
    const schedule = process.env.ETL_SCHEDULE || '0 */6 * * *'; // Every 6 hours by default

    logger.info(`Starting scheduled ETL with cron: ${schedule}`);

    // Main ETL job - runs every 6 hours
    cron.schedule(schedule, async () => {
      logger.info('Scheduled ETL triggered');
      await this.runAll();
    });

    // Trading ETL - runs every hour for real-time data
    cron.schedule('0 * * * *', async () => {
      logger.info('Scheduled trading ETL triggered');
      await this.runTradingETL();
    });

    // User ETL - runs every 4 hours
    cron.schedule('0 */4 * * *', async () => {
      logger.info('Scheduled user ETL triggered');
      await this.runUserETL();
    });

    // Revenue ETL - runs every 2 hours
    cron.schedule('0 */2 * * *', async () => {
      logger.info('Scheduled revenue ETL triggered');
      await this.runRevenueETL();
    });

    logger.info('All scheduled ETL jobs started');
  }

  stopScheduledETL(): void {
    cron.getTasks().forEach((task) => task.stop());
    logger.info('All scheduled ETL jobs stopped');
  }
}

// CLI runner
if (require.main === module) {
  const runner = new ETLRunner();
  const command = process.argv[2];

  (async () => {
    try {
      switch (command) {
        case 'all':
          await runner.runAll();
          break;
        case 'trading':
          await runner.runTradingETL();
          break;
        case 'user':
          await runner.runUserETL();
          break;
        case 'revenue':
          await runner.runRevenueETL();
          break;
        case 'schedule':
          runner.startScheduledETL();
          // Keep process alive
          await new Promise(() => {});
          break;
        default:
          console.log('Usage: ts-node runner.ts [all|trading|user|revenue|schedule]');
          process.exit(1);
      }

      if (command !== 'schedule') {
        process.exit(0);
      }
    } catch (error) {
      logger.error('ETL runner failed', error);
      process.exit(1);
    }
  })();
}
