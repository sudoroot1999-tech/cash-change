import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';

interface ExecutiveDashboard {
  kpis: {
    totalRevenue: number;
    revenueGrowth: number;
    totalUsers: number;
    userGrowth: number;
    tradingVolume: number;
    volumeGrowth: number;
    profitMargin: number;
  };
  trends: {
    revenue: any[];
    users: any[];
    volume: any[];
  };
  alerts: any[];
  targets: {
    metric: string;
    current: number;
    target: number;
    status: 'on-track' | 'at-risk' | 'behind';
  }[];
}

interface TradingDashboard {
  volumeMetrics: {
    volume24h: number;
    volume7d: number;
    volume30d: number;
    change24h: number;
  };
  topPairs: any[];
  orderFlow: any[];
  marketShare: any[];
  traderActivity: any[];
}

interface FinancialDashboard {
  revenue: {
    total: number;
    tradingFees: number;
    withdrawalFees: number;
    other: number;
  };
  costs: {
    total: number;
    breakdown: any[];
  };
  profitLoss: any[];
  cashFlow: any[];
  forecasts: any[];
}

interface UserDashboard {
  funnel: {
    visitors: number;
    signups: number;
    verified: number;
    deposited: number;
    traded: number;
  };
  cohorts: any[];
  retentionCurves: any[];
  churnPrediction: any[];
  segmentation: any[];
}

interface OperationalDashboard {
  systemHealth: {
    status: string;
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
  performance: {
    apiMetrics: any[];
    databaseMetrics: any[];
    cacheMetrics: any[];
  };
  incidents: any[];
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export class DashboardServiceComprehensive {
  private db: Pool;
  private cache: RedisClientType;
  private logger: typeof logger;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(db: Pool, cache: RedisClientType) {
    this.db = db;
    this.cache = cache;
    this.logger = logger;
  }

  /**
   * Get Executive Dashboard
   */
  async getExecutiveDashboard(): Promise<ExecutiveDashboard> {
    const cacheKey = 'dashboard:executive';
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get KPIs
      const kpisQuery = `
        WITH current_period AS (
          SELECT 
            SUM(f.total_revenue) as revenue,
            MAX(u.total_registered_users) as users,
            SUM(t.total_volume_24h) as volume,
            AVG(f.profit_margin) as margin
          FROM metrics_daily_financial f
          CROSS JOIN metrics_daily_users u ON DATE(f.time) = DATE(u.time)
          CROSS JOIN metrics_daily_trading t ON DATE(f.time) = DATE(t.time)
          WHERE f.time >= NOW() - INTERVAL '30 days'
        ),
        previous_period AS (
          SELECT 
            SUM(f.total_revenue) as revenue,
            MAX(u.total_registered_users) as users,
            SUM(t.total_volume_24h) as volume
          FROM metrics_daily_financial f
          CROSS JOIN metrics_daily_users u ON DATE(f.time) = DATE(u.time)
          CROSS JOIN metrics_daily_trading t ON DATE(f.time) = DATE(t.time)
          WHERE f.time >= NOW() - INTERVAL '60 days'
          AND f.time < NOW() - INTERVAL '30 days'
        )
        SELECT 
          c.revenue as current_revenue,
          p.revenue as previous_revenue,
          c.users as current_users,
          p.users as previous_users,
          c.volume as current_volume,
          p.volume as previous_volume,
          c.margin as profit_margin
        FROM current_period c, previous_period p
      `;

      const kpisResult = await this.db.query(kpisQuery);
      const kpi = kpisResult.rows[0];

      const kpis = {
        totalRevenue: parseFloat(kpi.current_revenue) || 0,
        revenueGrowth: this.calculateGrowth(
          parseFloat(kpi.current_revenue) || 0,
          parseFloat(kpi.previous_revenue) || 1
        ),
        totalUsers: parseInt(kpi.current_users) || 0,
        userGrowth: this.calculateGrowth(
          parseInt(kpi.current_users) || 0,
          parseInt(kpi.previous_users) || 1
        ),
        tradingVolume: parseFloat(kpi.current_volume) || 0,
        volumeGrowth: this.calculateGrowth(
          parseFloat(kpi.current_volume) || 0,
          parseFloat(kpi.previous_volume) || 1
        ),
        profitMargin: parseFloat(kpi.profit_margin) || 0,
      };

      // Get trends
      const trends = await this.getExecutiveTrends();

      // Get recent alerts
      const alertsQuery = `
        SELECT metric_name, severity, message, triggered_at
        FROM alert_history
        WHERE triggered_at >= NOW() - INTERVAL '7 days'
        AND resolved = false
        ORDER BY triggered_at DESC
        LIMIT 10
      `;
      const alertsResult = await this.db.query(alertsQuery);
      const alerts = alertsResult.rows;

      // Calculate targets
      const targets = [
        {
          metric: 'Revenue Growth',
          current: kpis.revenueGrowth,
          target: 20,
          status: kpis.revenueGrowth >= 20 ? 'on-track' : kpis.revenueGrowth >= 15 ? 'at-risk' : 'behind',
        },
        {
          metric: 'User Growth',
          current: kpis.userGrowth,
          target: 15,
          status: kpis.userGrowth >= 15 ? 'on-track' : kpis.userGrowth >= 10 ? 'at-risk' : 'behind',
        },
        {
          metric: 'Profit Margin',
          current: kpis.profitMargin * 100,
          target: 70,
          status: kpis.profitMargin >= 0.7 ? 'on-track' : kpis.profitMargin >= 0.6 ? 'at-risk' : 'behind',
        },
      ] as any[];

      const dashboard: ExecutiveDashboard = {
        kpis,
        trends,
        alerts,
        targets,
      };

      await this.cache.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(dashboard));
      return dashboard;
    } catch (error) {
      this.logger.error('Error fetching executive dashboard', error);
      throw error;
    }
  }

  /**
   * Get Trading Dashboard
   */
  async getTradingDashboard(): Promise<TradingDashboard> {
    try {
      const volumeQuery = `
        SELECT 
          SUM(CASE WHEN time >= NOW() - INTERVAL '1 day' THEN total_volume_24h ELSE 0 END) as volume_24h,
          SUM(CASE WHEN time >= NOW() - INTERVAL '7 days' THEN total_volume_7d ELSE 0 END) as volume_7d,
          SUM(total_volume_30d) as volume_30d
        FROM metrics_daily_trading
        WHERE time >= NOW() - INTERVAL '30 days'
      `;

      const volumeResult = await this.db.query(volumeQuery);
      const vol = volumeResult.rows[0];

      // Get previous 24h for comparison
      const prevVolumeQuery = `
        SELECT SUM(total_volume_24h) as volume
        FROM metrics_daily_trading
        WHERE time >= NOW() - INTERVAL '2 days'
        AND time < NOW() - INTERVAL '1 day'
      `;
      const prevVolResult = await this.db.query(prevVolumeQuery);
      const prevVol = parseFloat(prevVolResult.rows[0]?.volume) || 1;

      const volumeMetrics = {
        volume24h: parseFloat(vol.volume_24h) || 0,
        volume7d: parseFloat(vol.volume_7d) || 0,
        volume30d: parseFloat(vol.volume_30d) || 0,
        change24h: this.calculateGrowth(parseFloat(vol.volume_24h) || 0, prevVol),
      };

      // Get top trading pairs
      const topPairsQuery = `
        SELECT 
          trading_pair,
          SUM(total_volume_24h) as volume,
          SUM(number_of_trades) as trades,
          AVG(active_traders) as traders
        FROM metrics_daily_trading
        WHERE time >= NOW() - INTERVAL '1 day'
        AND trading_pair IS NOT NULL
        GROUP BY trading_pair
        ORDER BY volume DESC
        LIMIT 10
      `;
      const topPairsResult = await this.db.query(topPairsQuery);
      const topPairs = topPairsResult.rows.map(row => ({
        pair: row.trading_pair,
        volume: parseFloat(row.volume) || 0,
        trades: parseInt(row.trades) || 0,
        traders: Math.round(parseFloat(row.traders)) || 0,
      }));

      // Get order flow (hourly)
      const orderFlowQuery = `
        SELECT 
          time_bucket('1 hour', time) as hour,
          SUM(volume) as volume,
          SUM(buy_volume) as buy_volume,
          SUM(sell_volume) as sell_volume
        FROM metrics_hourly_trading
        WHERE time >= NOW() - INTERVAL '24 hours'
        GROUP BY hour
        ORDER BY hour ASC
      `;
      const orderFlowResult = await this.db.query(orderFlowQuery);
      const orderFlow = orderFlowResult.rows;

      // Market share
      const marketShareQuery = `
        WITH total_vol AS (
          SELECT SUM(total_volume_24h) as total
          FROM metrics_daily_trading
          WHERE time >= NOW() - INTERVAL '1 day'
          AND trading_pair IS NOT NULL
        )
        SELECT 
          trading_pair,
          SUM(total_volume_24h) as volume,
          (SUM(total_volume_24h) / (SELECT total FROM total_vol) * 100) as share
        FROM metrics_daily_trading
        WHERE time >= NOW() - INTERVAL '1 day'
        AND trading_pair IS NOT NULL
        GROUP BY trading_pair
        ORDER BY share DESC
        LIMIT 10
      `;
      const marketShareResult = await this.db.query(marketShareQuery);
      const marketShare = marketShareResult.rows;

      // Trader activity
      const traderActivityQuery = `
        SELECT 
          time_bucket('1 hour', time) as hour,
          AVG(active_traders) as active_traders
        FROM metrics_daily_trading
        WHERE time >= NOW() - INTERVAL '24 hours'
        GROUP BY hour
        ORDER BY hour ASC
      `;
      const traderActivityResult = await this.db.query(traderActivityQuery);
      const traderActivity = traderActivityResult.rows;

      return {
        volumeMetrics,
        topPairs,
        orderFlow,
        marketShare,
        traderActivity,
      };
    } catch (error) {
      this.logger.error('Error fetching trading dashboard', error);
      throw error;
    }
  }

  /**
   * Get Financial Dashboard
   */
  async getFinancialDashboard(): Promise<FinancialDashboard> {
    try {
      // Revenue breakdown
      const revenueQuery = `
        SELECT 
          SUM(total_revenue) as total,
          SUM(trading_fee_revenue) as trading_fees,
          SUM(withdrawal_fee_revenue) as withdrawal_fees,
          SUM(other_fee_revenue) as other
        FROM metrics_daily_financial
        WHERE time >= NOW() - INTERVAL '30 days'
      `;
      const revenueResult = await this.db.query(revenueQuery);
      const rev = revenueResult.rows[0];

      const revenue = {
        total: parseFloat(rev.total) || 0,
        tradingFees: parseFloat(rev.trading_fees) || 0,
        withdrawalFees: parseFloat(rev.withdrawal_fees) || 0,
        other: parseFloat(rev.other) || 0,
      };

      // Cost breakdown (placeholder)
      const costs = {
        total: revenue.total * 0.3,
        breakdown: [
          { category: 'Infrastructure', amount: revenue.total * 0.10 },
          { category: 'Personnel', amount: revenue.total * 0.12 },
          { category: 'Marketing', amount: revenue.total * 0.05 },
          { category: 'Other', amount: revenue.total * 0.03 },
        ],
      };

      // P&L
      const profitLossQuery = `
        SELECT 
          TO_CHAR(time_bucket('1 month', time), 'YYYY-MM') as month,
          SUM(total_revenue) as revenue,
          SUM(total_expenses) as expenses,
          SUM(net_profit) as profit
        FROM metrics_daily_financial
        WHERE time >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month ASC
      `;
      const profitLossResult = await this.db.query(profitLossQuery);
      const profitLoss = profitLossResult.rows;

      // Cash flow (simplified)
      const cashFlow = profitLoss.map(pl => ({
        month: pl.month,
        inflow: parseFloat(pl.revenue),
        outflow: parseFloat(pl.expenses),
        net: parseFloat(pl.profit),
      }));

      // Forecasts (placeholder)
      const forecasts = [
        { month: 1, revenue: revenue.total * 1.1, confidence: 0.85 },
        { month: 2, revenue: revenue.total * 1.15, confidence: 0.75 },
        { month: 3, revenue: revenue.total * 1.22, confidence: 0.65 },
      ];

      return {
        revenue,
        costs,
        profitLoss,
        cashFlow,
        forecasts,
      };
    } catch (error) {
      this.logger.error('Error fetching financial dashboard', error);
      throw error;
    }
  }

  /**
   * Get User Dashboard
   */
  async getUserDashboard(): Promise<UserDashboard> {
    try {
      // User funnel (simplified)
      const funnelQuery = `
        WITH funnel_data AS (
          SELECT 
            COUNT(DISTINCT user_id) as total_users
          FROM users
          WHERE created_at >= NOW() - INTERVAL '30 days'
        )
        SELECT 
          5000 as visitors,
          (SELECT total_users FROM funnel_data) as signups,
          (SELECT total_users * 0.7 FROM funnel_data) as verified,
          (SELECT total_users * 0.5 FROM funnel_data) as deposited,
          (SELECT total_users * 0.4 FROM funnel_data) as traded
      `;
      const funnelResult = await this.db.query(funnelQuery);
      const funnel = funnelResult.rows[0];

      // Cohorts
      const cohortsQuery = `
        SELECT 
          cohort_date,
          total_users,
          retention_day_1,
          retention_day_7,
          retention_day_30,
          retention_day_90
        FROM user_cohorts
        ORDER BY cohort_date DESC
        LIMIT 12
      `;
      const cohortsResult = await this.db.query(cohortsQuery);
      const cohorts = cohortsResult.rows;

      // Retention curves
      const retentionCurves = cohorts.map(c => ({
        cohort: c.cohort_date,
        day1: c.retention_day_1,
        day7: c.retention_day_7,
        day30: c.retention_day_30,
        day90: c.retention_day_90,
      }));

      // Churn prediction
      const churnQuery = `
        SELECT 
          risk_level,
          COUNT(*) as user_count
        FROM churn_predictions
        WHERE status = 'active'
        GROUP BY risk_level
      `;
      const churnResult = await this.db.query(churnQuery);
      const churnPrediction = churnResult.rows;

      // Segmentation (placeholder)
      const segmentation = [
        { segment: 'VIP', users: 150, revenue: 50000 },
        { segment: 'Active', users: 1200, revenue: 30000 },
        { segment: 'Regular', users: 3500, revenue: 15000 },
        { segment: 'New', users: 2000, revenue: 2000 },
      ];

      return {
        funnel,
        cohorts,
        retentionCurves,
        churnPrediction,
        segmentation,
      };
    } catch (error) {
      this.logger.error('Error fetching user dashboard', error);
      throw error;
    }
  }

  /**
   * Get Operational Dashboard
   */
  async getOperationalDashboard(): Promise<OperationalDashboard> {
    try {
      // System health
      const healthQuery = `
        SELECT 
          AVG(system_uptime_pct) as uptime,
          AVG(avg_api_response_time) as response_time,
          AVG(error_rate) as error_rate
        FROM metrics_hourly_operational
        WHERE time >= NOW() - INTERVAL '1 hour'
      `;
      const healthResult = await this.db.query(healthQuery);
      const health = healthResult.rows[0];

      const uptime = parseFloat(health.uptime) || 100;
      const responseTime = parseFloat(health.response_time) || 0;
      const errorRate = parseFloat(health.error_rate) || 0;

      let status = 'healthy';
      if (uptime < 99.0 || errorRate > 5 || responseTime > 2000) {
        status = 'critical';
      } else if (uptime < 99.9 || errorRate > 1 || responseTime > 1000) {
        status = 'degraded';
      }

      const systemHealth = {
        status,
        uptime,
        responseTime,
        errorRate,
      };

      // Performance metrics
      const apiMetricsQuery = `
        SELECT 
          time_bucket('1 hour', time) as hour,
          AVG(avg_api_response_time) as avg_response,
          MAX(max_api_response_time) as max_response,
          SUM(api_requests_total) as total_requests
        FROM metrics_hourly_operational
        WHERE time >= NOW() - INTERVAL '24 hours'
        GROUP BY hour
        ORDER BY hour ASC
      `;
      const apiMetricsResult = await this.db.query(apiMetricsQuery);
      const apiMetrics = apiMetricsResult.rows;

      const databaseMetrics = []; // Would be populated from monitoring
      const cacheMetrics = []; // Would be populated from monitoring

      const performance = {
        apiMetrics,
        databaseMetrics,
        cacheMetrics,
      };

      // Recent incidents
      const incidentsQuery = `
        SELECT metric_name, severity, message, triggered_at
        FROM alert_history
        WHERE severity IN ('critical', 'warning')
        AND triggered_at >= NOW() - INTERVAL '7 days'
        ORDER BY triggered_at DESC
        LIMIT 10
      `;
      const incidentsResult = await this.db.query(incidentsQuery);
      const incidents = incidentsResult.rows;

      // Resource utilization
      const resourcesQuery = `
        SELECT 
          AVG(cpu_usage) as cpu,
          AVG(memory_usage) as memory,
          AVG(disk_usage) as disk
        FROM metrics_hourly_operational
        WHERE time >= NOW() - INTERVAL '1 hour'
      `;
      const resourcesResult = await this.db.query(resourcesQuery);
      const res = resourcesResult.rows[0];

      const resources = {
        cpu: parseFloat(res.cpu) || 0,
        memory: parseFloat(res.memory) || 0,
        disk: parseFloat(res.disk) || 0,
      };

      return {
        systemHealth,
        performance,
        incidents,
        resources,
      };
    } catch (error) {
      this.logger.error('Error fetching operational dashboard', error);
      throw error;
    }
  }

  /**
   * Helper: Get executive trends
   */
  private async getExecutiveTrends(): Promise<any> {
    const revenueQuery = `
      SELECT 
        time_bucket('1 day', time) as date,
        SUM(total_revenue) as revenue
      FROM metrics_daily_financial
      WHERE time >= NOW() - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date ASC
    `;
    const revenueResult = await this.db.query(revenueQuery);

    const usersQuery = `
      SELECT 
        time_bucket('1 day', time) as date,
        AVG(daily_active_users) as users
      FROM metrics_daily_users
      WHERE time >= NOW() - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date ASC
    `;
    const usersResult = await this.db.query(usersQuery);

    const volumeQuery = `
      SELECT 
        time_bucket('1 day', time) as date,
        SUM(total_volume_24h) as volume
      FROM metrics_daily_trading
      WHERE time >= NOW() - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date ASC
    `;
    const volumeResult = await this.db.query(volumeQuery);

    return {
      revenue: revenueResult.rows,
      users: usersResult.rows,
      volume: volumeResult.rows,
    };
  }

  /**
   * Helper: Calculate growth percentage
   */
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
}
