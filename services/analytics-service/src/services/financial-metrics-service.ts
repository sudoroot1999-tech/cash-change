import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';

interface FinancialMetrics {
  totalRevenue: number;
  tradingFeeRevenue: number;
  withdrawalFeeRevenue: number;
  otherFeeRevenue: number;
  revenueByVipUsers: number;
  revenueByRegularUsers: number;
  revenueGrowthRate: number;
  avgRevenuePerUser: number;
  profitMargin: number;
  totalExpenses: number;
  netProfit: number;
  breakEvenVolume: number;
}

interface RevenueBreakdown {
  date: string;
  tradingFees: number;
  withdrawalFees: number;
  otherFees: number;
  total: number;
}

interface RevenueBySegment {
  segment: string;
  revenue: number;
  userCount: number;
  revenuePerUser: number;
  percentage: number;
}

interface ProfitLoss {
  period: string;
  revenue: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}

export class FinancialMetricsService {
  private db: Pool;
  private cache: RedisClientType;
  private logger: any;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(db: Pool, cache: RedisClientType) {
    this.db = db;
    this.cache = cache;
    this.logger = logger;
  }

  /**
   * Get comprehensive financial metrics
   */
  async getFinancialMetrics(startDate: Date, endDate: Date): Promise<FinancialMetrics> {
    const cacheKey = `financial_metrics:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const query = `
        SELECT 
          SUM(total_revenue) as total_revenue,
          SUM(trading_fee_revenue) as trading_fee_revenue,
          SUM(withdrawal_fee_revenue) as withdrawal_fee_revenue,
          SUM(other_fee_revenue) as other_fee_revenue,
          SUM(revenue_by_vip_users) as revenue_by_vip_users,
          SUM(revenue_by_regular_users) as revenue_by_regular_users,
          AVG(revenue_growth_rate) as revenue_growth_rate,
          AVG(avg_revenue_per_user) as avg_revenue_per_user,
          AVG(profit_margin) as profit_margin,
          SUM(total_expenses) as total_expenses,
          SUM(net_profit) as net_profit,
          AVG(break_even_volume) as break_even_volume
        FROM metrics_daily_financial
        WHERE time >= $1 AND time <= $2
      `;

      const result = await this.db.query(query, [startDate, endDate]);
      const row = result.rows[0];

      const metrics: FinancialMetrics = {
        totalRevenue: parseFloat(row.total_revenue) || 0,
        tradingFeeRevenue: parseFloat(row.trading_fee_revenue) || 0,
        withdrawalFeeRevenue: parseFloat(row.withdrawal_fee_revenue) || 0,
        otherFeeRevenue: parseFloat(row.other_fee_revenue) || 0,
        revenueByVipUsers: parseFloat(row.revenue_by_vip_users) || 0,
        revenueByRegularUsers: parseFloat(row.revenue_by_regular_users) || 0,
        revenueGrowthRate: parseFloat(row.revenue_growth_rate) || 0,
        avgRevenuePerUser: parseFloat(row.avg_revenue_per_user) || 0,
        profitMargin: parseFloat(row.profit_margin) || 0,
        totalExpenses: parseFloat(row.total_expenses) || 0,
        netProfit: parseFloat(row.net_profit) || 0,
        breakEvenVolume: parseFloat(row.break_even_volume) || 0,
      };

      await this.cache.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
      return metrics;
    } catch (error) {
      this.logger.error('Error fetching financial metrics', error);
      throw error;
    }
  }

  /**
   * Get revenue breakdown over time
   */
  async getRevenueBreakdown(days: number = 30, granularity: 'day' | 'week' | 'month' = 'day'): Promise<RevenueBreakdown[]> {
    try {
      const bucketSize = granularity === 'day' ? '1 day' : granularity === 'week' ? '1 week' : '1 month';

      const query = `
        SELECT 
          time_bucket($1, time) as date,
          SUM(trading_fee_revenue) as trading_fees,
          SUM(withdrawal_fee_revenue) as withdrawal_fees,
          SUM(other_fee_revenue) as other_fees,
          SUM(total_revenue) as total
        FROM metrics_daily_financial
        WHERE time >= NOW() - INTERVAL '${days} days'
        GROUP BY date
        ORDER BY date ASC
      `;

      const result = await this.db.query(query, [bucketSize]);

      return result.rows.map(row => ({
        date: row.date,
        tradingFees: parseFloat(row.trading_fees) || 0,
        withdrawalFees: parseFloat(row.withdrawal_fees) || 0,
        otherFees: parseFloat(row.other_fees) || 0,
        total: parseFloat(row.total) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching revenue breakdown', error);
      throw error;
    }
  }

  /**
   * Get revenue by user segment
   */
  async getRevenueBySegment(startDate: Date, endDate: Date): Promise<RevenueBySegment[]> {
    try {
      const query = `
        WITH user_revenue AS (
          SELECT 
            u.user_id,
            u.user_tier,
            SUM(t.fee_amount) as revenue
          FROM users u
          INNER JOIN transactions t ON u.user_id = t.user_id
          WHERE t.created_at >= $1 AND t.created_at <= $2
          GROUP BY u.user_id, u.user_tier
        ),
        segment_stats AS (
          SELECT 
            CASE
              WHEN user_tier IN ('VIP', 'PREMIUM') THEN 'VIP/Premium'
              WHEN user_tier = 'GOLD' THEN 'Gold'
              WHEN user_tier = 'SILVER' THEN 'Silver'
              ELSE 'Regular'
            END as segment,
            user_id,
            revenue
          FROM user_revenue
        )
        SELECT 
          segment,
          SUM(revenue) as revenue,
          COUNT(*) as user_count,
          AVG(revenue) as revenue_per_user,
          (SUM(revenue) / (SELECT SUM(revenue) FROM segment_stats) * 100) as percentage
        FROM segment_stats
        GROUP BY segment
        ORDER BY revenue DESC
      `;

      const result = await this.db.query(query, [startDate, endDate]);

      return result.rows.map(row => ({
        segment: row.segment,
        revenue: parseFloat(row.revenue) || 0,
        userCount: parseInt(row.user_count) || 0,
        revenuePerUser: parseFloat(row.revenue_per_user) || 0,
        percentage: parseFloat(row.percentage) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching revenue by segment', error);
      throw error;
    }
  }

  /**
   * Get profit & loss statement
   */
  async getProfitLoss(months: number = 12): Promise<ProfitLoss[]> {
    try {
      const query = `
        SELECT 
          TO_CHAR(time_bucket('1 month', time), 'YYYY-MM') as period,
          SUM(total_revenue) as revenue,
          SUM(total_expenses) as expenses,
          SUM(total_revenue - total_expenses) as gross_profit,
          SUM(net_profit) as net_profit,
          AVG(profit_margin) as profit_margin
        FROM metrics_daily_financial
        WHERE time >= NOW() - INTERVAL '${months} months'
        GROUP BY period
        ORDER BY period DESC
      `;

      const result = await this.db.query(query);

      return result.rows.map(row => ({
        period: row.period,
        revenue: parseFloat(row.revenue) || 0,
        expenses: parseFloat(row.expenses) || 0,
        grossProfit: parseFloat(row.gross_profit) || 0,
        netProfit: parseFloat(row.net_profit) || 0,
        profitMargin: parseFloat(row.profit_margin) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching profit & loss', error);
      throw error;
    }
  }

  /**
   * Get ARPU (Average Revenue Per User) trend
   */
  async getARPUTrend(days: number = 30): Promise<any[]> {
    try {
      const query = `
        SELECT 
          time_bucket('1 day', time) as date,
          AVG(avg_revenue_per_user) as arpu
        FROM metrics_daily_financial
        WHERE time >= NOW() - INTERVAL '${days} days'
        GROUP BY date
        ORDER BY date ASC
      `;

      const result = await this.db.query(query);

      return result.rows.map(row => ({
        date: row.date,
        arpu: parseFloat(row.arpu) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching ARPU trend', error);
      throw error;
    }
  }

  /**
   * Get revenue forecast
   */
  async getRevenueForecast(months: number = 3): Promise<any[]> {
    try {
      // Get historical data for trend analysis
      const query = `
        SELECT 
          time_bucket('1 month', time) as month,
          SUM(total_revenue) as revenue
        FROM metrics_daily_financial
        WHERE time >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month ASC
      `;

      const result = await this.db.query(query);
      const historical = result.rows.map(row => parseFloat(row.revenue) || 0);

      // Simple linear regression for forecast
      const forecast = this.calculateLinearForecast(historical, months);

      return forecast.map((value, index) => ({
        month: index + 1,
        forecastedRevenue: value,
        confidence: 0.8 - (index * 0.1), // Decreasing confidence
      }));
    } catch (error) {
      this.logger.error('Error calculating revenue forecast', error);
      throw error;
    }
  }

  /**
   * Calculate and store financial metrics (for ETL process)
   */
  async calculateAndStoreFinancialMetrics(date: Date): Promise<void> {
    try {
      this.logger.info(`Calculating financial metrics for ${date.toISOString()}`);

      // Calculate trading fee revenue
      const tradingFeesResult = await this.db.query(
        `SELECT COALESCE(SUM(fee_amount), 0) as total
         FROM transactions
         WHERE DATE(created_at) = DATE($1)
         AND transaction_type = 'trading_fee'`,
        [date]
      );
      const tradingFeeRevenue = parseFloat(tradingFeesResult.rows[0].total) || 0;

      // Calculate withdrawal fee revenue
      const withdrawalFeesResult = await this.db.query(
        `SELECT COALESCE(SUM(fee_amount), 0) as total
         FROM transactions
         WHERE DATE(created_at) = DATE($1)
         AND transaction_type = 'withdrawal_fee'`,
        [date]
      );
      const withdrawalFeeRevenue = parseFloat(withdrawalFeesResult.rows[0].total) || 0;

      // Calculate other fee revenue
      const otherFeesResult = await this.db.query(
        `SELECT COALESCE(SUM(fee_amount), 0) as total
         FROM transactions
         WHERE DATE(created_at) = DATE($1)
         AND transaction_type NOT IN ('trading_fee', 'withdrawal_fee')`,
        [date]
      );
      const otherFeeRevenue = parseFloat(otherFeesResult.rows[0].total) || 0;

      const totalRevenue = tradingFeeRevenue + withdrawalFeeRevenue + otherFeeRevenue;

      // Calculate revenue by VIP users
      const vipRevenueResult = await this.db.query(
        `SELECT COALESCE(SUM(t.fee_amount), 0) as total
         FROM transactions t
         INNER JOIN users u ON t.user_id = u.user_id
         WHERE DATE(t.created_at) = DATE($1)
         AND u.user_tier IN ('VIP', 'PREMIUM', 'GOLD')`,
        [date]
      );
      const revenueByVipUsers = parseFloat(vipRevenueResult.rows[0].total) || 0;

      const revenueByRegularUsers = totalRevenue - revenueByVipUsers;

      // Calculate revenue growth rate
      const revenueGrowthRate = await this.calculateRevenueGrowthRate(date);

      // Calculate ARPU
      const activeUsersResult = await this.db.query(
        `SELECT COUNT(DISTINCT user_id) as count
         FROM user_sessions
         WHERE DATE(last_activity) = DATE($1)`,
        [date]
      );
      const activeUsers = parseInt(activeUsersResult.rows[0].count) || 1;
      const avgRevenuePerUser = totalRevenue / activeUsers;

      // Calculate expenses (placeholder - would need actual expense tracking)
      const totalExpenses = totalRevenue * 0.3; // Assume 30% cost structure
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? netProfit / totalRevenue : 0;

      // Calculate break-even volume
      const avgTradingFeeRate = 0.001; // 0.1% average fee
      const breakEvenVolume = totalExpenses / avgTradingFeeRate;

      // Insert metrics
      const insertQuery = `
        INSERT INTO metrics_daily_financial (
          time, total_revenue, trading_fee_revenue, withdrawal_fee_revenue,
          other_fee_revenue, revenue_by_vip_users, revenue_by_regular_users,
          revenue_growth_rate, avg_revenue_per_user, profit_margin,
          total_expenses, net_profit, break_even_volume
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (time) DO UPDATE SET
          total_revenue = EXCLUDED.total_revenue,
          trading_fee_revenue = EXCLUDED.trading_fee_revenue,
          withdrawal_fee_revenue = EXCLUDED.withdrawal_fee_revenue,
          other_fee_revenue = EXCLUDED.other_fee_revenue,
          revenue_by_vip_users = EXCLUDED.revenue_by_vip_users,
          revenue_by_regular_users = EXCLUDED.revenue_by_regular_users,
          revenue_growth_rate = EXCLUDED.revenue_growth_rate,
          avg_revenue_per_user = EXCLUDED.avg_revenue_per_user,
          profit_margin = EXCLUDED.profit_margin,
          total_expenses = EXCLUDED.total_expenses,
          net_profit = EXCLUDED.net_profit,
          break_even_volume = EXCLUDED.break_even_volume
      `;

      await this.db.query(insertQuery, [
        date,
        totalRevenue,
        tradingFeeRevenue,
        withdrawalFeeRevenue,
        otherFeeRevenue,
        revenueByVipUsers,
        revenueByRegularUsers,
        revenueGrowthRate,
        avgRevenuePerUser,
        profitMargin,
        totalExpenses,
        netProfit,
        breakEvenVolume,
      ]);

      this.logger.info(`Financial metrics calculated and stored for ${date.toISOString()}`);
    } catch (error) {
      this.logger.error('Error calculating financial metrics', error);
      throw error;
    }
  }

  /**
   * Calculate revenue growth rate
   */
  private async calculateRevenueGrowthRate(date: Date): Promise<number> {
    try {
      const currentPeriodStart = new Date(date);
      currentPeriodStart.setDate(currentPeriodStart.getDate() - 30);

      const previousPeriodStart = new Date(currentPeriodStart);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);

      const currentQuery = `
        SELECT COALESCE(SUM(total_revenue), 0) as revenue
        FROM metrics_daily_financial
        WHERE time >= $1 AND time <= $2
      `;

      const currentResult = await this.db.query(currentQuery, [currentPeriodStart, date]);
      const currentRevenue = parseFloat(currentResult.rows[0].revenue) || 0;

      const previousResult = await this.db.query(currentQuery, [previousPeriodStart, currentPeriodStart]);
      const previousRevenue = parseFloat(previousResult.rows[0].revenue) || 1;

      return (currentRevenue - previousRevenue) / previousRevenue;
    } catch (error) {
      this.logger.error('Error calculating revenue growth rate', error);
      return 0;
    }
  }

  /**
   * Simple linear forecast calculation
   */
  private calculateLinearForecast(historical: number[], periods: number): number[] {
    if (historical.length < 2) {
      return Array(periods).fill(historical[0] || 0);
    }

    // Calculate linear trend
    const n = historical.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += historical[i];
      sumXY += i * historical[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast
    const forecast: number[] = [];
    for (let i = 0; i < periods; i++) {
      const value = slope * (n + i) + intercept;
      forecast.push(Math.max(0, value)); // Ensure non-negative
    }

    return forecast;
  }
}
