import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { DashboardController } from './controllers/dashboard-controller';
import { TradingController } from './controllers/trading-controller';
import { UserController } from './controllers/user-controller';
import { FinancialController } from './controllers/financial-controller';
import { RiskController } from './controllers/risk-controller';
import { MarketingController } from './controllers/marketing-controller';
import { ReportController } from './controllers/report-controller';
import { BusinessMetricsController } from './controllers/business-metrics-controller';
import { authMiddleware } from './middleware/auth';
import { validateRequest } from './middleware/validator';

const router: Router = Router();

// Initialize database and cache connections
const db = new Pool({
  host: process.env.TIMESCALE_HOST,
  port: parseInt(process.env.TIMESCALE_PORT || '5432'),
  database: process.env.TIMESCALE_DB,
  user: process.env.TIMESCALE_USER,
  password: process.env.TIMESCALE_PASSWORD,
});

const cache = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});
cache.connect();

// Controllers
const dashboardController = new DashboardController();
const tradingController = new TradingController();
const userController = new UserController();
const financialController = new FinancialController();
const riskController = new RiskController();
const marketingController = new MarketingController();
const reportController = new ReportController();
const businessMetricsController = new BusinessMetricsController(db, cache as any);

// Public health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'analytics', timestamp: new Date().toISOString() });
});

// Apply authentication to all routes below
router.use(authMiddleware);

// Dashboard routes
router.get('/analytics/overview', dashboardController.getOverview.bind(dashboardController));
router.get('/analytics/executive', dashboardController.getExecutiveDashboard.bind(dashboardController));

// Trading analytics routes
router.get('/analytics/trading-volume', tradingController.getTradingVolume.bind(tradingController));
router.get('/analytics/trading-analytics', tradingController.getTradingAnalytics.bind(tradingController));
router.get('/analytics/price-history/:pair', tradingController.getPriceHistory.bind(tradingController));
router.get('/analytics/liquidity/:pair', tradingController.getLiquidityMetrics.bind(tradingController));

// User analytics routes
router.get('/analytics/user-metrics', userController.getUserMetrics.bind(userController));
router.get('/analytics/user-analytics', userController.getUserAnalytics.bind(userController));
router.get('/analytics/cohort-analysis', userController.getCohortAnalysis.bind(userController));
router.get('/analytics/churn-predictions', userController.getChurnPredictions.bind(userController));
router.get('/analytics/conversion-funnel/:name', userController.getConversionFunnel.bind(userController));

// Financial routes
router.get('/analytics/revenue', financialController.getRevenue.bind(financialController));
router.get('/analytics/financial-report', financialController.getFinancialReport.bind(financialController));
router.get('/analytics/fee-revenue', financialController.getFeeRevenue.bind(financialController));
router.get('/analytics/asset-liability', financialController.getAssetLiability.bind(financialController));

// Risk routes
router.get('/analytics/risk-report', riskController.getRiskReport.bind(riskController));
router.get('/analytics/risk-exposure', riskController.getExposure.bind(riskController));
router.get('/analytics/liquidations', riskController.getLiquidations.bind(riskController));
router.get('/analytics/fraud-alerts', riskController.getFraudAlerts.bind(riskController));
router.get('/analytics/concentration-risk', riskController.getConcentrationRisk.bind(riskController));

// Marketing routes
router.get('/analytics/marketing-report', marketingController.getMarketingReport.bind(marketingController));
router.get('/analytics/campaigns', marketingController.getCampaigns.bind(marketingController));
router.get('/analytics/referral-stats', marketingController.getReferralStats.bind(marketingController));
router.get('/analytics/conversion-funnels', marketingController.getConversionFunnels.bind(marketingController));

// Report generation routes
router.post('/analytics/report/generate', validateRequest, reportController.generateReport.bind(reportController));
router.get('/analytics/report/download/:filename', reportController.downloadReport.bind(reportController));
router.post('/analytics/report/schedule', validateRequest, reportController.scheduleReport.bind(reportController));

// Custom query route (admin only)
router.post('/analytics/custom-query', validateRequest, reportController.executeCustomQuery.bind(reportController));

// Business Metrics routes (comprehensive KPI tracking)
router.get('/metrics/overview', businessMetricsController.getOverview.bind(businessMetricsController));
router.get('/metrics/users', businessMetricsController.getUserMetrics.bind(businessMetricsController));
router.get('/metrics/trading', businessMetricsController.getTradingMetrics.bind(businessMetricsController));
router.get('/metrics/revenue', businessMetricsController.getRevenueMetrics.bind(businessMetricsController));
router.get('/metrics/wallet', businessMetricsController.getWalletMetrics.bind(businessMetricsController));
router.get('/metrics/operational', businessMetricsController.getOperationalMetrics.bind(businessMetricsController));
router.get('/metrics/kpis', businessMetricsController.getKeyKPIs.bind(businessMetricsController));

// Alert management routes
router.get('/metrics/alerts', businessMetricsController.getAlerts.bind(businessMetricsController));
router.post('/metrics/alerts/:id/acknowledge', businessMetricsController.acknowledgeAlert.bind(businessMetricsController));
router.post('/metrics/alerts/:id/resolve', businessMetricsController.resolveAlert.bind(businessMetricsController));
router.get('/metrics/anomalies', businessMetricsController.detectAnomalies.bind(businessMetricsController));

export default router;
