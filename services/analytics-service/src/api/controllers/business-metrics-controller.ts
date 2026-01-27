import { Request, Response } from 'express';
import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { UserMetricsService } from '../../services/user-metrics-service';
import { TradingMetricsService } from '../../services/trading-metrics-service';
import { FinancialMetricsService } from '../../services/financial-metrics-service';
import { WalletMetricsService } from '../../services/wallet-metrics-service';
import { OperationalMetricsService } from '../../services/operational-metrics-service';
import { AlertService } from '../../services/alert-service';
import { logger as loggerInstance } from '../../utils/logger';

export class BusinessMetricsController {
  private userMetrics: UserMetricsService;
  private tradingMetrics: TradingMetricsService;
  private financialMetrics: FinancialMetricsService;
  private walletMetrics: WalletMetricsService;
  private operationalMetrics: OperationalMetricsService;
  private alertService: AlertService;
  private logger: typeof loggerInstance;

  constructor(db: Pool, cache: RedisClientType) {
    this.userMetrics = new UserMetricsService(db, cache);
    this.tradingMetrics = new TradingMetricsService(db, cache);
    this.financialMetrics = new FinancialMetricsService(db, cache);
    this.walletMetrics = new WalletMetricsService(db, cache);
    this.operationalMetrics = new OperationalMetricsService(db, cache);
    this.alertService = new AlertService(db, cache);
    this.logger = loggerInstance;
  }

  /**
   * GET /api/metrics/overview
   * Get comprehensive business metrics overview
   */
  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const daysNum = parseInt(days as string);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const [
        userMetrics,
        tradingMetrics,
        financialMetrics,
        walletMetrics,
        operationalMetrics,
        systemHealth,
      ] = await Promise.all([
        this.userMetrics.getUserMetrics(startDate, endDate),
        this.tradingMetrics.getTradingMetrics(startDate, endDate),
        this.financialMetrics.getFinancialMetrics(startDate, endDate),
        this.walletMetrics.getWalletMetrics(startDate, endDate),
        this.operationalMetrics.getOperationalMetrics(24),
        this.operationalMetrics.getSystemHealthStatus(),
      ]);

      res.json({
        success: true,
        data: {
          period: { startDate, endDate, days: daysNum },
          user: userMetrics,
          trading: tradingMetrics,
          financial: financialMetrics,
          wallet: walletMetrics,
          operational: operationalMetrics,
          systemHealth,
        },
      });
    } catch (error) {
      this.logger.error('Error fetching overview metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch overview metrics',
      });
    }
  }

  /**
   * GET /api/metrics/users
   * Get detailed user metrics
   */
  async getUserMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const daysNum = parseInt(days as string);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const [
        metrics,
        growthData,
        activeUsersTrends,
        retentionCohorts,
        segmentation,
      ] = await Promise.all([
        this.userMetrics.getUserMetrics(startDate, endDate),
        this.userMetrics.getUserGrowthData(startDate, endDate, 'day'),
        this.userMetrics.getActiveUsersTrends(daysNum),
        this.userMetrics.getRetentionCohorts(12),
        this.userMetrics.getUserSegmentation(),
      ]);

      res.json({
        success: true,
        data: {
          summary: metrics,
          growth: growthData,
          activeUsers: activeUsersTrends,
          retention: retentionCohorts,
          segmentation,
        },
      });
    } catch (error) {
      this.logger.error('Error fetching user metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user metrics',
      });
    }
  }

  /**
   * GET /api/metrics/trading
   * Get detailed trading metrics
   */
  async getTradingMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const daysNum = parseInt(days as string);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const [
        metrics,
        volumeByPair,
        volumeTrends,
        traderDistribution,
        makerTakerAnalysis,
        tradingFrequency,
      ] = await Promise.all([
        this.tradingMetrics.getTradingMetrics(startDate, endDate),
        this.tradingMetrics.getVolumeByPair(daysNum),
        this.tradingMetrics.getVolumeTrends(daysNum, 'day'),
        this.tradingMetrics.getTraderDistribution(),
        this.tradingMetrics.getMakerTakerAnalysis(7),
        this.tradingMetrics.getTradingFrequency(),
      ]);

      res.json({
        success: true,
        data: {
          summary: metrics,
          volumeByPair,
          volumeTrends,
          traderDistribution,
          makerTaker: makerTakerAnalysis,
          tradingFrequency,
        },
      });
    } catch (error) {
      this.logger.error('Error fetching trading metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trading metrics',
      });
    }
  }

  /**
   * GET /api/metrics/revenue
   * Get detailed financial metrics
   */
  async getRevenueMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const daysNum = parseInt(days as string);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const [
        metrics,
        revenueBreakdown,
        revenueBySegment,
        profitLoss,
        arpuTrend,
        forecast,
      ] = await Promise.all([
        this.financialMetrics.getFinancialMetrics(startDate, endDate),
        this.financialMetrics.getRevenueBreakdown(daysNum, 'day'),
        this.financialMetrics.getRevenueBySegment(startDate, endDate),
        this.financialMetrics.getProfitLoss(12),
        this.financialMetrics.getARPUTrend(daysNum),
        this.financialMetrics.getRevenueForecast(3),
      ]);

      res.json({
        success: true,
        data: {
          summary: metrics,
          breakdown: revenueBreakdown,
          bySegment: revenueBySegment,
          profitLoss,
          arpu: arpuTrend,
          forecast,
        },
      });
    } catch (error) {
      this.logger.error('Error fetching revenue metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue metrics',
      });
    }
  }

  /**
   * GET /api/metrics/wallet
   * Get detailed wallet metrics
   */
  async getWalletMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30, asset } = req.query;
      const daysNum = parseInt(days as string);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const [
        metrics,
        assetDistribution,
        depositWithdrawalTrends,
        balanceDistribution,
        topDepositors,
        aumTrends,
      ] = await Promise.all([
        this.walletMetrics.getWalletMetrics(startDate, endDate, asset as string),
        this.walletMetrics.getAssetDistribution(),
        this.walletMetrics.getDepositWithdrawalTrends(daysNum),
        this.walletMetrics.getWalletBalanceDistribution(),
        this.walletMetrics.getTopDepositors(10, daysNum),
        this.walletMetrics.getAUMTrends(90),
      ]);

      res.json({
        success: true,
        data: {
          summary: metrics,
          assetDistribution,
          trends: depositWithdrawalTrends,
          balanceDistribution,
          topDepositors,
          aumTrends,
        },
      });
    } catch (error) {
      this.logger.error('Error fetching wallet metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet metrics',
      });
    }
  }

  /**
   * GET /api/metrics/operational
   * Get operational metrics
   */
  async getOperationalMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { hours = 24, days = 7 } = req.query;
      const hoursNum = parseInt(hours as string);
      const daysNum = parseInt(days as string);

      const [
        metrics,
        supportMetrics,
        systemHealth,
        apiPerformance,
        errorAnalysis,
        uptimeReport,
      ] = await Promise.all([
        this.operationalMetrics.getOperationalMetrics(hoursNum),
        this.operationalMetrics.getSupportMetrics(daysNum),
        this.operationalMetrics.getSystemHealthStatus(),
        this.operationalMetrics.getApiPerformanceTrends(hoursNum),
        this.operationalMetrics.getErrorRateAnalysis(daysNum),
        this.operationalMetrics.getUptimeReport(30),
      ]);

      res.json({
        success: true,
        data: {
          summary: metrics,
          support: supportMetrics,
          health: systemHealth,
          apiPerformance,
          errors: errorAnalysis,
          uptime: uptimeReport,
        },
      });
    } catch (error) {
      this.logger.error('Error fetching operational metrics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch operational metrics',
      });
    }
  }

  /**
   * GET /api/metrics/alerts
   * Get alert history
   */
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { days = 7, severity } = req.query;
      const daysNum = parseInt(days as string);

      const alerts = await this.alertService.getAlertHistory(
        daysNum,
        severity as string
      );

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      this.logger.error('Error fetching alerts', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts',
      });
    }
  }

  /**
   * POST /api/metrics/alerts/:id/acknowledge
   * Acknowledge an alert
   */
  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'system';

      await this.alertService.acknowledgeAlert(parseInt(id), userId);

      res.json({
        success: true,
        message: 'Alert acknowledged',
      });
    } catch (error) {
      this.logger.error('Error acknowledging alert', error);
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert',
      });
    }
  }

  /**
   * POST /api/metrics/alerts/:id/resolve
   * Resolve an alert
   */
  async resolveAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.alertService.resolveAlert(parseInt(id));

      res.json({
        success: true,
        message: 'Alert resolved',
      });
    } catch (error) {
      this.logger.error('Error resolving alert', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert',
      });
    }
  }

  /**
   * GET /api/metrics/anomalies
   * Detect anomalies in metrics
   */
  async detectAnomalies(req: Request, res: Response): Promise<void> {
    try {
      const { category = 'operational' } = req.query;

      const anomalies = await this.alertService.detectAnomalies(category as string);

      res.json({
        success: true,
        data: anomalies,
      });
    } catch (error) {
      this.logger.error('Error detecting anomalies', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect anomalies',
      });
    }
  }

  /**
   * GET /api/metrics/kpis
   * Get all key KPIs for executive dashboard
   */
  async getKeyKPIs(req: Request, res: Response): Promise<void> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const [userMetrics, tradingMetrics, financialMetrics] = await Promise.all([
        this.userMetrics.getUserMetrics(startDate, endDate),
        this.tradingMetrics.getTradingMetrics(startDate, endDate),
        this.financialMetrics.getFinancialMetrics(startDate, endDate),
      ]);

      const kpis = {
        // User KPIs
        totalUsers: userMetrics.totalRegisteredUsers,
        dau: userMetrics.dailyActiveUsers,
        mau: userMetrics.monthlyActiveUsers,
        userGrowthRate: userMetrics.growthRate,
        retention30Day: userMetrics.retention30Day,
        churnRate: userMetrics.churnRate,
        
        // Trading KPIs
        tradingVolume24h: tradingMetrics.totalVolume24h,
        tradingVolume30d: tradingMetrics.totalVolume30d,
        numberOfTrades: tradingMetrics.numberOfTrades,
        activeTraders: tradingMetrics.activeTraders,
        
        // Financial KPIs
        totalRevenue: financialMetrics.totalRevenue,
        tradingFeeRevenue: financialMetrics.tradingFeeRevenue,
        profitMargin: financialMetrics.profitMargin,
        arpu: financialMetrics.avgRevenuePerUser,
        ltvCacRatio: userMetrics.ltvCacRatio,
        
        // Targets and Comparisons
        targets: {
          userGrowthRate: 0.15, // 15% target
          retention30Day: 0.40, // 40% target
          profitMargin: 0.70, // 70% target
          systemUptime: 99.9, // 99.9% target
        },
      };

      res.json({
        success: true,
        data: kpis,
      });
    } catch (error) {
      this.logger.error('Error fetching KPIs', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch KPIs',
      });
    }
  }
}
