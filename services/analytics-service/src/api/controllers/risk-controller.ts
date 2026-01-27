import { Request, Response } from 'express';
import { RiskService } from '../../services/risk-service';
import { logger } from '../../utils/logger';

export class RiskController {
  private riskService: RiskService;

  constructor() {
    this.riskService = new RiskService();
  }

  async getRiskReport(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const report = await this.riskService.getRiskReport(startDate, endDate);
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Error getting risk report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch risk report',
      });
    }
  }

  async getExposure(req: Request, res: Response): Promise<void> {
    try {
      const exposures = await this.riskService.getExposureByAsset();
      
      res.json({
        success: true,
        data: exposures,
      });
    } catch (error) {
      logger.error('Error getting exposure', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch exposure data',
      });
    }
  }

  async getLiquidations(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const liquidations = await this.riskService.getLiquidationEvents(startDate, endDate);
      
      res.json({
        success: true,
        data: liquidations,
      });
    } catch (error) {
      logger.error('Error getting liquidations', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch liquidation events',
      });
    }
  }

  async getFraudAlerts(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();
      const status = req.query.status as string | undefined;

      const alerts = await this.riskService.getFraudAlerts(startDate, endDate, status);
      
      res.json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      logger.error('Error getting fraud alerts', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch fraud alerts',
      });
    }
  }

  async getConcentrationRisk(req: Request, res: Response): Promise<void> {
    try {
      const concentration = await this.riskService.getConcentrationRisk();
      
      res.json({
        success: true,
        data: concentration,
      });
    } catch (error) {
      logger.error('Error getting concentration risk', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch concentration risk',
      });
    }
  }
}
