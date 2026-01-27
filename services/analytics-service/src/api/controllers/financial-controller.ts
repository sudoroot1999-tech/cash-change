import { Request, Response } from 'express';
import { FinancialService } from '../../services/financial-service';
import { logger } from '../../utils/logger';

export class FinancialController {
  private financialService: FinancialService;

  constructor() {
    this.financialService = new FinancialService();
  }

  async getFinancialReport(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const report = await this.financialService.getFinancialReport(startDate, endDate);
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Error getting financial report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch financial report',
      });
    }
  }

  async getRevenue(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();
      const currency = req.query.currency as string | undefined;

      const metrics = await this.financialService.getRevenueMetrics(startDate, endDate, currency);
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Error getting revenue metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue metrics',
      });
    }
  }

  async getFeeRevenue(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const feeRevenue = await this.financialService.getFeeRevenue(startDate, endDate);
      
      res.json({
        success: true,
        data: feeRevenue,
      });
    } catch (error) {
      logger.error('Error getting fee revenue', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch fee revenue',
      });
    }
  }

  async getAssetLiability(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.financialService.getAssetLiabilityManagement();
      
      res.json({
        success: true,
        data: data,
      });
    } catch (error) {
      logger.error('Error getting asset/liability data', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset/liability data',
      });
    }
  }
}
