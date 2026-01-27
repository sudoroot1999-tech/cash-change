import { Request, Response } from 'express';
import { MarketingService } from '../../services/marketing-service';
import { logger } from '../../utils/logger';

export class MarketingController {
  private marketingService: MarketingService;

  constructor() {
    this.marketingService = new MarketingService();
  }

  async getMarketingReport(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const report = await this.marketingService.getMarketingReport(startDate, endDate);
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Error getting marketing report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch marketing report',
      });
    }
  }

  async getCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const campaignId = req.query.campaign_id as string | undefined;
      const campaigns = await this.marketingService.getCampaignPerformance(campaignId);
      
      res.json({
        success: true,
        data: campaigns,
      });
    } catch (error) {
      logger.error('Error getting campaigns', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch campaign data',
      });
    }
  }

  async getReferralStats(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const stats = await this.marketingService.getReferralStats(startDate, endDate);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting referral stats', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch referral stats',
      });
    }
  }

  async getConversionFunnels(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const funnels = await this.marketingService.getConversionFunnels(startDate, endDate);
      
      res.json({
        success: true,
        data: funnels,
      });
    } catch (error) {
      logger.error('Error getting conversion funnels', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversion funnels',
      });
    }
  }
}
