import { Request, Response } from 'express';
import { TradingAnalyticsService } from '../../services/trading-analytics-service';
import { logger } from '../../utils/logger';

export class TradingController {
  private tradingService: TradingAnalyticsService;

  constructor() {
    this.tradingService = new TradingAnalyticsService();
  }

  async getTradingAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const analytics = await this.tradingService.getTradingAnalytics(startDate, endDate);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error getting trading analytics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trading analytics',
      });
    }
  }

  async getTradingVolume(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();
      const pair = req.query.pair as string | undefined;

      const volume = await this.tradingService.getVolumeByPair(startDate, endDate, pair);
      
      res.json({
        success: true,
        data: volume,
      });
    } catch (error) {
      logger.error('Error getting trading volume', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trading volume',
      });
    }
  }

  async getPriceHistory(req: Request, res: Response): Promise<void> {
    try {
      const pair = req.params.pair;
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const history = await this.tradingService.getPriceHistory(pair, startDate, endDate);
      
      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Error getting price history', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch price history',
      });
    }
  }

  async getLiquidityMetrics(req: Request, res: Response): Promise<void> {
    try {
      const pair = req.params.pair;
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const metrics = await this.tradingService.getLiquidityMetrics(pair, startDate, endDate);
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Error getting liquidity metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch liquidity metrics',
      });
    }
  }
}
