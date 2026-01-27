import { Request, Response } from 'express';
import { DashboardService } from '../../services/dashboard-service';
import { logger } from '../../utils/logger';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await this.dashboardService.getOverview();
      
      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      logger.error('Error getting dashboard overview', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard overview',
      });
    }
  }

  async getExecutiveDashboard(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.start_date 
        ? new Date(req.query.start_date as string) 
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.end_date 
        ? new Date(req.query.end_date as string) 
        : new Date();

      const dashboard = await this.dashboardService.getExecutiveDashboard(startDate, endDate);
      
      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      logger.error('Error getting executive dashboard', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch executive dashboard',
      });
    }
  }
}
