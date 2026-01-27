import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';

interface UserMetrics {
  totalRegisteredUsers: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  newRegistrations: number;
  retention1Day: number;
  retention7Day: number;
  retention30Day: number;
  churnRate: number;
  userLifetimeValue: number;
  customerAcquisitionCost: number;
  ltvCacRatio: number;
  growthRate: number;
}

interface UserGrowthData {
  date: string;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  growthRate: number;
}

interface RetentionCohort {
  cohortDate: string;
  totalUsers: number;
  day1: number;
  day7: number;
  day30: number;
  day90: number;
}

interface UserSegment {
  segment: string;
  userCount: number;
  avgLifetimeValue: number;
  avgTransactionVolume: number;
  percentage: number;
}

export class UserMetricsService {
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
   * Get comprehensive user metrics for a time period
   */
  async getUserMetrics(startDate: Date, endDate: Date): Promise<UserMetrics> {
    const cacheKey = `user_metrics:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    try {
      // Check cache
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const query = `
        SELECT 
          MAX(total_registered_users) as total_registered_users,
          AVG(daily_active_users) as daily_active_users,
          AVG(weekly_active_users) as weekly_active_users,
          AVG(monthly_active_users) as monthly_active_users,
          SUM(new_registrations) as new_registrations,
          AVG(retention_1_day) as retention_1_day,
          AVG(retention_7_day) as retention_7_day,
          AVG(retention_30_day) as retention_30_day,
          AVG(churn_rate) as churn_rate,
          AVG(user_lifetime_value) as user_lifetime_value,
          AVG(customer_acquisition_cost) as customer_acquisition_cost,
          AVG(ltv_cac_ratio) as ltv_cac_ratio,
          AVG(growth_rate) as growth_rate
        FROM metrics_daily_users
        WHERE time >= $1 AND time <= $2
      `;

      const result = await this.db.query(query, [startDate, endDate]);
      const row = result.rows[0];

      const metrics: UserMetrics = {
        totalRegisteredUsers: parseInt(row.total_registered_users) || 0,
        dailyActiveUsers: Math.round(parseFloat(row.daily_active_users)) || 0,
        weeklyActiveUsers: Math.round(parseFloat(row.weekly_active_users)) || 0,
        monthlyActiveUsers: Math.round(parseFloat(row.monthly_active_users)) || 0,
        newRegistrations: parseInt(row.new_registrations) || 0,
        retention1Day: parseFloat(row.retention_1_day) || 0,
        retention7Day: parseFloat(row.retention_7_day) || 0,
        retention30Day: parseFloat(row.retention_30_day) || 0,
        churnRate: parseFloat(row.churn_rate) || 0,
        userLifetimeValue: parseFloat(row.user_lifetime_value) || 0,
        customerAcquisitionCost: parseFloat(row.customer_acquisition_cost) || 0,
        ltvCacRatio: parseFloat(row.ltv_cac_ratio) || 0,
        growthRate: parseFloat(row.growth_rate) || 0,
      };

      // Cache the result
      await this.cache.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));

      return metrics;
    } catch (error) {
      this.logger.error('Error fetching user metrics', error);
      throw error;
    }
  }

  /**
   * Get user growth data over time
   */
  async getUserGrowthData(startDate: Date, endDate: Date, granularity: 'day' | 'week' | 'month' = 'day'): Promise<UserGrowthData[]> {
    try {
      const bucketSize = granularity === 'day' ? '1 day' : granularity === 'week' ? '1 week' : '1 month';

      const query = `
        SELECT 
          time_bucket($1, time) as date,
          MAX(total_registered_users) as total_users,
          SUM(new_registrations) as new_users,
          AVG(daily_active_users) as active_users,
          AVG(growth_rate) as growth_rate
        FROM metrics_daily_users
        WHERE time >= $2 AND time <= $3
        GROUP BY date
        ORDER BY date ASC
      `;

      const result = await this.db.query(query, [bucketSize, startDate, endDate]);

      return result.rows.map(row => ({
        date: row.date,
        totalUsers: parseInt(row.total_users) || 0,
        newUsers: parseInt(row.new_users) || 0,
        activeUsers: Math.round(parseFloat(row.active_users)) || 0,
        growthRate: parseFloat(row.growth_rate) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching user growth data', error);
      throw error;
    }
  }

  /**
   * Get DAU/WAU/MAU trends
   */
  async getActiveUsersTrends(days: number = 30): Promise<any[]> {
    try {
      const query = `
        SELECT 
          time_bucket('1 day', time) as date,
          AVG(daily_active_users) as dau,
          AVG(weekly_active_users) as wau,
          AVG(monthly_active_users) as mau
        FROM metrics_daily_users
        WHERE time >= NOW() - INTERVAL '${days} days'
        GROUP BY date
        ORDER BY date ASC
      `;

      const result = await this.db.query(query);

      return result.rows.map(row => ({
        date: row.date,
        dau: Math.round(parseFloat(row.dau)) || 0,
        wau: Math.round(parseFloat(row.wau)) || 0,
        mau: Math.round(parseFloat(row.mau)) || 0,
        dauWauRatio: row.wau > 0 ? (parseFloat(row.dau) / parseFloat(row.wau)) : 0,
        dauMauRatio: row.mau > 0 ? (parseFloat(row.dau) / parseFloat(row.mau)) : 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching active users trends', error);
      throw error;
    }
  }

  /**
   * Get retention cohorts
   */
  async getRetentionCohorts(limit: number = 12): Promise<RetentionCohort[]> {
    try {
      const query = `
        SELECT 
          cohort_date,
          total_users,
          retention_day_1,
          retention_day_7,
          retention_day_30,
          retention_day_90
        FROM user_cohorts
        ORDER BY cohort_date DESC
        LIMIT $1
      `;

      const result = await this.db.query(query, [limit]);

      return result.rows.map(row => ({
        cohortDate: row.cohort_date,
        totalUsers: parseInt(row.total_users) || 0,
        day1: parseInt(row.retention_day_1) || 0,
        day7: parseInt(row.retention_day_7) || 0,
        day30: parseInt(row.retention_day_30) || 0,
        day90: parseInt(row.retention_day_90) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching retention cohorts', error);
      throw error;
    }
  }

  /**
   * Get user segmentation data
   */
  async getUserSegmentation(): Promise<UserSegment[]> {
    try {
      const query = `
        WITH user_segments AS (
          SELECT 
            user_id,
            CASE
              WHEN total_trading_volume >= 100000 THEN 'VIP'
              WHEN total_trading_volume >= 10000 THEN 'Active'
              WHEN total_trading_volume >= 1000 THEN 'Regular'
              WHEN total_trading_volume > 0 THEN 'New'
              ELSE 'Inactive'
            END as segment,
            lifetime_value,
            total_trading_volume
          FROM (
            SELECT 
              user_id,
              SUM(volume) as total_trading_volume,
              SUM(fees_paid) as lifetime_value
            FROM trades
            GROUP BY user_id
          ) user_stats
        )
        SELECT 
          segment,
          COUNT(*) as user_count,
          AVG(lifetime_value) as avg_lifetime_value,
          AVG(total_trading_volume) as avg_transaction_volume,
          (COUNT(*)::float / (SELECT COUNT(*) FROM user_segments) * 100) as percentage
        FROM user_segments
        GROUP BY segment
        ORDER BY avg_lifetime_value DESC
      `;

      const result = await this.db.query(query);

      return result.rows.map(row => ({
        segment: row.segment,
        userCount: parseInt(row.user_count) || 0,
        avgLifetimeValue: parseFloat(row.avg_lifetime_value) || 0,
        avgTransactionVolume: parseFloat(row.avg_transaction_volume) || 0,
        percentage: parseFloat(row.percentage) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching user segmentation', error);
      throw error;
    }
  }

  /**
   * Calculate and update user metrics (for ETL process)
   */
  async calculateAndStoreUserMetrics(date: Date): Promise<void> {
    try {
      this.logger.info(`Calculating user metrics for ${date.toISOString()}`);

      // Calculate total registered users
      const totalUsersResult = await this.db.query(
        'SELECT COUNT(*) as total FROM users WHERE created_at <= $1',
        [date]
      );
      const totalRegisteredUsers = parseInt(totalUsersResult.rows[0].total) || 0;

      // Calculate DAU
      const dauResult = await this.db.query(
        `SELECT COUNT(DISTINCT user_id) as dau 
         FROM user_sessions 
         WHERE DATE(last_activity) = DATE($1)`,
        [date]
      );
      const dailyActiveUsers = parseInt(dauResult.rows[0].dau) || 0;

      // Calculate WAU
      const wauResult = await this.db.query(
        `SELECT COUNT(DISTINCT user_id) as wau 
         FROM user_sessions 
         WHERE last_activity >= $1 - INTERVAL '7 days' 
         AND last_activity <= $1`,
        [date]
      );
      const weeklyActiveUsers = parseInt(wauResult.rows[0].wau) || 0;

      // Calculate MAU
      const mauResult = await this.db.query(
        `SELECT COUNT(DISTINCT user_id) as mau 
         FROM user_sessions 
         WHERE last_activity >= $1 - INTERVAL '30 days' 
         AND last_activity <= $1`,
        [date]
      );
      const monthlyActiveUsers = parseInt(mauResult.rows[0].mau) || 0;

      // Calculate new registrations
      const newRegsResult = await this.db.query(
        'SELECT COUNT(*) as new_users FROM users WHERE DATE(created_at) = DATE($1)',
        [date]
      );
      const newRegistrations = parseInt(newRegsResult.rows[0].new_users) || 0;

      // Calculate retention rates
      const retention1Day = await this.calculateRetentionRate(date, 1);
      const retention7Day = await this.calculateRetentionRate(date, 7);
      const retention30Day = await this.calculateRetentionRate(date, 30);

      // Calculate churn rate
      const churnRate = await this.calculateChurnRate(date);

      // Calculate LTV
      const ltv = await this.calculateAverageLTV(date);

      // Calculate CAC
      const cac = await this.calculateCAC(date);

      // Calculate LTV/CAC ratio
      const ltvCacRatio = cac > 0 ? ltv / cac : 0;

      // Calculate growth rate
      const growthRate = await this.calculateGrowthRate(date);

      // Insert or update metrics
      const insertQuery = `
        INSERT INTO metrics_daily_users (
          time, total_registered_users, daily_active_users, weekly_active_users,
          monthly_active_users, new_registrations, retention_1_day, retention_7_day,
          retention_30_day, churn_rate, user_lifetime_value, customer_acquisition_cost,
          ltv_cac_ratio, growth_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (time) DO UPDATE SET
          total_registered_users = EXCLUDED.total_registered_users,
          daily_active_users = EXCLUDED.daily_active_users,
          weekly_active_users = EXCLUDED.weekly_active_users,
          monthly_active_users = EXCLUDED.monthly_active_users,
          new_registrations = EXCLUDED.new_registrations,
          retention_1_day = EXCLUDED.retention_1_day,
          retention_7_day = EXCLUDED.retention_7_day,
          retention_30_day = EXCLUDED.retention_30_day,
          churn_rate = EXCLUDED.churn_rate,
          user_lifetime_value = EXCLUDED.user_lifetime_value,
          customer_acquisition_cost = EXCLUDED.customer_acquisition_cost,
          ltv_cac_ratio = EXCLUDED.ltv_cac_ratio,
          growth_rate = EXCLUDED.growth_rate
      `;

      await this.db.query(insertQuery, [
        date,
        totalRegisteredUsers,
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
        newRegistrations,
        retention1Day,
        retention7Day,
        retention30Day,
        churnRate,
        ltv,
        cac,
        ltvCacRatio,
        growthRate,
      ]);

      this.logger.info(`User metrics calculated and stored for ${date.toISOString()}`);
    } catch (error) {
      this.logger.error('Error calculating user metrics', error);
      throw error;
    }
  }

  /**
   * Calculate retention rate for a specific period
   */
  private async calculateRetentionRate(date: Date, days: number): Promise<number> {
    try {
      const cohortDate = new Date(date);
      cohortDate.setDate(cohortDate.getDate() - days);

      const cohortQuery = `
        SELECT COUNT(DISTINCT user_id) as cohort_size
        FROM users
        WHERE DATE(created_at) = DATE($1)
      `;
      const cohortResult = await this.db.query(cohortQuery, [cohortDate]);
      const cohortSize = parseInt(cohortResult.rows[0].cohort_size) || 0;

      if (cohortSize === 0) return 0;

      const retainedQuery = `
        SELECT COUNT(DISTINCT u.user_id) as retained
        FROM users u
        INNER JOIN user_sessions s ON u.user_id = s.user_id
        WHERE DATE(u.created_at) = DATE($1)
        AND DATE(s.last_activity) = DATE($2)
      `;
      const retainedResult = await this.db.query(retainedQuery, [cohortDate, date]);
      const retained = parseInt(retainedResult.rows[0].retained) || 0;

      return retained / cohortSize;
    } catch (error) {
      this.logger.error(`Error calculating ${days}-day retention rate`, error);
      return 0;
    }
  }

  /**
   * Calculate churn rate
   */
  private async calculateChurnRate(date: Date): Promise<number> {
    try {
      const periodStart = new Date(date);
      periodStart.setDate(periodStart.getDate() - 30);

      const activeAtStartQuery = `
        SELECT COUNT(DISTINCT user_id) as active_start
        FROM user_sessions
        WHERE last_activity >= $1 - INTERVAL '30 days'
        AND last_activity < $1
      `;
      const startResult = await this.db.query(activeAtStartQuery, [periodStart]);
      const activeAtStart = parseInt(startResult.rows[0].active_start) || 0;

      if (activeAtStart === 0) return 0;

      const churnedQuery = `
        SELECT COUNT(DISTINCT user_id) as churned
        FROM (
          SELECT user_id
          FROM user_sessions
          WHERE last_activity >= $1 - INTERVAL '60 days'
          AND last_activity < $1 - INTERVAL '30 days'
          EXCEPT
          SELECT user_id
          FROM user_sessions
          WHERE last_activity >= $1 - INTERVAL '30 days'
        ) churned_users
      `;
      const churnedResult = await this.db.query(churnedQuery, [date]);
      const churned = parseInt(churnedResult.rows[0].churned) || 0;

      return churned / activeAtStart;
    } catch (error) {
      this.logger.error('Error calculating churn rate', error);
      return 0;
    }
  }

  /**
   * Calculate average user lifetime value
   */
  private async calculateAverageLTV(date: Date): Promise<number> {
    try {
      const query = `
        SELECT AVG(lifetime_revenue) as avg_ltv
        FROM (
          SELECT 
            user_id,
            SUM(fee_amount) as lifetime_revenue
          FROM transactions
          WHERE created_at <= $1
          GROUP BY user_id
        ) user_revenues
      `;
      const result = await this.db.query(query, [date]);
      return parseFloat(result.rows[0].avg_ltv) || 0;
    } catch (error) {
      this.logger.error('Error calculating average LTV', error);
      return 0;
    }
  }

  /**
   * Calculate customer acquisition cost
   */
  private async calculateCAC(date: Date): Promise<number> {
    try {
      const periodStart = new Date(date);
      periodStart.setMonth(periodStart.getMonth() - 1);

      const marketingSpendQuery = `
        SELECT COALESCE(SUM(spend), 0) as total_spend
        FROM campaign_performance
        WHERE start_date >= $1 AND start_date <= $2
      `;
      const spendResult = await this.db.query(marketingSpendQuery, [periodStart, date]);
      const marketingSpend = parseFloat(spendResult.rows[0].total_spend) || 0;

      const newUsersQuery = `
        SELECT COUNT(*) as new_users
        FROM users
        WHERE created_at >= $1 AND created_at <= $2
      `;
      const usersResult = await this.db.query(newUsersQuery, [periodStart, date]);
      const newUsers = parseInt(usersResult.rows[0].new_users) || 0;

      return newUsers > 0 ? marketingSpend / newUsers : 0;
    } catch (error) {
      this.logger.error('Error calculating CAC', error);
      return 0;
    }
  }

  /**
   * Calculate user growth rate
   */
  private async calculateGrowthRate(date: Date): Promise<number> {
    try {
      const previousMonth = new Date(date);
      previousMonth.setMonth(previousMonth.getMonth() - 1);

      const currentQuery = 'SELECT COUNT(*) as count FROM users WHERE created_at <= $1';
      const previousQuery = 'SELECT COUNT(*) as count FROM users WHERE created_at <= $1';

      const currentResult = await this.db.query(currentQuery, [date]);
      const previousResult = await this.db.query(previousQuery, [previousMonth]);

      const current = parseInt(currentResult.rows[0].count) || 0;
      const previous = parseInt(previousResult.rows[0].count) || 1;

      return (current - previous) / previous;
    } catch (error) {
      this.logger.error('Error calculating growth rate', error);
      return 0;
    }
  }
}
