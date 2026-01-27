import { analyticsDb } from '../config/database';
import { DashboardOverview, ExecutiveDashboard } from '../models/types';
import { logger } from '../utils/logger';
import { CacheService } from './cache-service';
import { subDays, startOfDay } from 'date-fns';

export class DashboardService {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  async getOverview(): Promise<DashboardOverview> {
    const cacheKey = 'dashboard:overview';
    const cached = await this.cacheService.get<DashboardOverview>(cacheKey);
    if (cached) return cached;

    try {
      const now = new Date();
      const yesterday = subDays(now, 1);

      // Total users
      const totalUsers = await analyticsDb('user_activity_metrics')
        .where('metric_type', 'MAU')
        .orderBy('time', 'desc')
        .first()
        .then((r) => r?.total_users || 0);

      // Active users last 24h
      const activeUsers24h = await analyticsDb('user_activity_metrics')
        .where('metric_type', 'DAU')
        .where('time', '>=', yesterday)
        .sum('total_users as total')
        .first()
        .then((r) => parseInt(r?.total as string) || 0);

      // Trading volume last 24h
      const volume24h = await analyticsDb('trading_volume_metrics')
        .where('time', '>=', yesterday)
        .sum('total_volume as total')
        .first()
        .then((r) => parseFloat(r?.total as string) || 0);

      // Total trades last 24h
      const trades24h = await analyticsDb('trading_volume_metrics')
        .where('time', '>=', yesterday)
        .sum('trade_count as total')
        .first()
        .then((r) => parseInt(r?.total as string) || 0);

      // Total revenue last 24h
      const revenue24h = await analyticsDb('revenue_metrics')
        .where('time', '>=', yesterday)
        .sum('amount as total')
        .first()
        .then((r) => parseFloat(r?.total as string) || 0);

      // Top trading pairs
      const topPairs = await analyticsDb('trading_volume_metrics')
        .select('trading_pair')
        .sum('total_volume as volume')
        .where('time', '>=', yesterday)
        .groupBy('trading_pair')
        .orderBy('volume', 'desc')
        .limit(5);

      const topTradingPairs = topPairs.map((p) => ({
        pair: p.trading_pair,
        volume: parseFloat(p.volume) || 0,
        change_24h: 0, // Would calculate from historical data
      }));

      // User growth
      const dauToday = await analyticsDb('user_activity_metrics')
        .where('metric_type', 'DAU')
        .where('time', '>=', startOfDay(now))
        .sum('new_users as total')
        .first()
        .then((r) => parseInt(r?.total as string) || 0);

      const wauWeek = await analyticsDb('user_activity_metrics')
        .where('metric_type', 'DAU')
        .where('time', '>=', subDays(now, 7))
        .sum('new_users as total')
        .first()
        .then((r) => parseInt(r?.total as string) || 0);

      const mauMonth = await analyticsDb('user_activity_metrics')
        .where('metric_type', 'DAU')
        .where('time', '>=', subDays(now, 30))
        .sum('new_users as total')
        .first()
        .then((r) => parseInt(r?.total as string) || 0);

      const overview: DashboardOverview = {
        timestamp: now,
        total_users: totalUsers,
        active_users_24h: activeUsers24h,
        total_volume_24h: volume24h,
        total_trades_24h: trades24h,
        total_revenue_24h: revenue24h,
        top_trading_pairs: topTradingPairs,
        user_growth: {
          daily: dauToday,
          weekly: wauWeek,
          monthly: mauMonth,
        },
      };

      await this.cacheService.set(cacheKey, overview, 60); // Cache for 1 minute
      return overview;
    } catch (error) {
      logger.error('Error getting dashboard overview', error);
      throw error;
    }
  }

  async getExecutiveDashboard(startDate: Date, endDate: Date): Promise<ExecutiveDashboard> {
    const cacheKey = `dashboard:executive:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.cacheService.get<ExecutiveDashboard>(cacheKey);
    if (cached) return cached;

    try {
      // Revenue data
      const revenueData = await analyticsDb('revenue_metrics')
        .select(
          analyticsDb.raw('DATE(time) as date'),
          analyticsDb.raw('SUM(amount) as amount')
        )
        .whereBetween('time', [startDate, endDate])
        .groupBy(analyticsDb.raw('DATE(time)'))
        .orderBy('date');

      const totalRevenue = revenueData.reduce((sum, r) => sum + parseFloat(r.amount), 0);

      const revenueByType = await analyticsDb('revenue_metrics')
        .select('revenue_type')
        .sum('amount as total')
        .whereBetween('time', [startDate, endDate])
        .groupBy('revenue_type');

      const revenueBreakdown: Record<string, number> = {};
      revenueByType.forEach((r) => {
        revenueBreakdown[r.revenue_type] = parseFloat(r.total);
      });

      // User data
      const userMetrics = await analyticsDb('user_activity_metrics')
        .where('metric_type', 'MAU')
        .whereBetween('time', [startDate, endDate])
        .orderBy('time', 'desc')
        .first();

      const newUsers = await analyticsDb('user_activity_metrics')
        .where('metric_type', 'DAU')
        .whereBetween('time', [startDate, endDate])
        .sum('new_users as total')
        .first();

      const activeUsers = await analyticsDb('user_activity_metrics')
        .where('metric_type', 'DAU')
        .whereBetween('time', [startDate, endDate])
        .avg('total_users as avg')
        .first();

      // Trading data
      const tradingMetrics = await analyticsDb('trading_volume_metrics')
        .whereBetween('time', [startDate, endDate])
        .select(
          analyticsDb.raw('SUM(total_volume) as volume'),
          analyticsDb.raw('SUM(trade_count) as trades'),
          analyticsDb.raw('AVG(avg_trade_size) as avg_size')
        )
        .first();

      // Calculate growth rate
      const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
      const previousUsers = await analyticsDb('user_activity_metrics')
        .where('metric_type', 'MAU')
        .whereBetween('time', [previousPeriodStart, startDate])
        .orderBy('time', 'desc')
        .first();

      const currentUserCount = userMetrics?.total_users || 0;
      const previousUserCount = previousUsers?.total_users || 1;
      const growthRate = ((currentUserCount - previousUserCount) / previousUserCount) * 100;

      // Calculate key metrics
      const revenuePerUser = currentUserCount > 0 ? totalRevenue / currentUserCount : 0;

      const avgLTV = await analyticsDb('user_cohorts')
        .avg('avg_lifetime_value as avg')
        .first()
        .then((r) => parseFloat(r?.avg as string) || 0);

      const churnRate = await this.calculateChurnRate(startDate, endDate);
      const retentionRate = 100 - churnRate;

      const dashboard: ExecutiveDashboard = {
        period: { start: startDate, end: endDate },
        revenue: {
          total: totalRevenue,
          trend: revenueData.map((r) => ({
            date: new Date(r.date),
            amount: parseFloat(r.amount),
          })),
          breakdown: revenueBreakdown,
        },
        users: {
          total: currentUserCount,
          new: parseInt(newUsers?.total as string) || 0,
          active: Math.round(parseFloat(activeUsers?.avg as string) || 0),
          growth_rate: growthRate,
        },
        trading: {
          volume: parseFloat(tradingMetrics?.volume) || 0,
          trades: parseInt(tradingMetrics?.trades) || 0,
          avg_trade_size: parseFloat(tradingMetrics?.avg_size) || 0,
        },
        market_share: {}, // Would need external data
        key_metrics: {
          revenue_per_user: revenuePerUser,
          avg_ltv: avgLTV,
          churn_rate: churnRate,
          retention_rate: retentionRate,
        },
      };

      await this.cacheService.set(cacheKey, dashboard, 300); // Cache for 5 minutes
      return dashboard;
    } catch (error) {
      logger.error('Error getting executive dashboard', error);
      throw error;
    }
  }

  private async calculateChurnRate(startDate: Date, endDate: Date): Promise<number> {
    try {
      const churned = await analyticsDb('churn_predictions')
        .where('status', 'churned')
        .whereBetween('predicted_at', [startDate, endDate])
        .count('* as count')
        .first();

      const total = await analyticsDb('user_activity_metrics')
        .where('metric_type', 'MAU')
        .whereBetween('time', [startDate, endDate])
        .avg('total_users as avg')
        .first();

      const churnedCount = parseInt(churned?.count as string) || 0;
      const totalUsers = parseFloat(total?.avg as string) || 1;

      return (churnedCount / totalUsers) * 100;
    } catch (error) {
      logger.error('Error calculating churn rate', error);
      return 0;
    }
  }
}
