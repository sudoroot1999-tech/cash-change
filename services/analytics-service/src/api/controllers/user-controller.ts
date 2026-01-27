import { Request, Response } from 'express';
import { UserAnalyticsService } from '../../services/user-analytics-service';
import { logger } from '../../utils/logger';

export class UserController {
  private userService: UserAnalyticsService;

  constructor() {
    this.userService = new UserAnalyticsService();
  }

  async getUserAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const analytics = await this.userService.getUserAnalytics(startDate, endDate);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error getting user analytics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user analytics',
      });
    }
  }

  async getUserMetrics(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();
      const metricType = req.query.metric_type as string | undefined;

      const metrics = await this.userService.getUserActivity(startDate, endDate, metricType);
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Error getting user metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user metrics',
      });
    }
  }

  async getCohortAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const cohorts = await this.userService.getCohortAnalysis(startDate, endDate);
      
      res.json({
        success: true,
        data: cohorts,
      });
    } catch (error) {
      logger.error('Error getting cohort analysis', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch cohort analysis',
      });
    }
  }

  async getChurnPredictions(req: Request, res: Response): Promise<void> {
    try {
      const riskLevel = req.query.risk_level as string | undefined;

      const predictions = await this.userService.getChurnPredictions(riskLevel);
      
      res.json({
        success: true,
        data: predictions,
      });
    } catch (error) {
      logger.error('Error getting churn predictions', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch churn predictions',
      });
    }
  }

  async getConversionFunnel(req: Request, res: Response): Promise<void> {
    try {
      const funnelName = req.params.name;
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const funnel = await this.userService.getConversionFunnel(funnelName, startDate, endDate);
      
      res.json({
        success: true,
        data: funnel,
      });
    } catch (error) {
      logger.error('Error getting conversion funnel', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversion funnel',
      });
    }
  }
}
