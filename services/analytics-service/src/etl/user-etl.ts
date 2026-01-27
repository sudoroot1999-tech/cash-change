import { authDb, tradingDb, analyticsDb } from '../config/database';
import { UserActivityMetric, UserCohort, ChurnPrediction } from '../models/types';
import { logger } from '../utils/logger';
import { startOfDay, subDays, differenceInDays } from 'date-fns';

export class UserETL {
  async extractUserActivityMetrics(date: Date): Promise<void> {
    try {
      logger.info('Starting user activity metrics ETL', { date });

      const startOfDayDate = startOfDay(date);
      const endOfDayDate = new Date(startOfDayDate.getTime() + 24 * 60 * 60 * 1000);

      // Daily Active Users (DAU)
      const dau = await authDb
        .countDistinct('user_id as count')
        .from('user_sessions')
        .whereBetween('last_activity', [startOfDayDate, endOfDayDate])
        .first();

      const newUsersCount = await authDb
        .count('user_id as count')
        .from('users')
        .whereBetween('created_at', [startOfDayDate, endOfDayDate])
        .first();

      const activeTraders = await tradingDb
        .countDistinct('user_id as count')
        .from('trades')
        .whereBetween('created_at', [startOfDayDate, endOfDayDate])
        .first();

      const verifiedUsers = await authDb
        .count('user_id as count')
        .from('users')
        .where('kyc_status', 'verified')
        .whereBetween('kyc_verified_at', [startOfDayDate, endOfDayDate])
        .first();

      const dauMetric: Partial<UserActivityMetric> = {
        time: startOfDayDate,
        metric_type: 'DAU',
        total_users: parseInt(dau?.count as string) || 0,
        new_users: parseInt(newUsersCount?.count as string) || 0,
        active_traders: parseInt(activeTraders?.count as string) || 0,
        verified_users: parseInt(verifiedUsers?.count as string) || 0,
      };

      await analyticsDb('user_activity_metrics')
        .insert(dauMetric)
        .onConflict(['time', 'metric_type'])
        .merge();

      // Weekly Active Users (WAU)
      const weekAgo = subDays(date, 7);
      const wau = await authDb
        .countDistinct('user_id as count')
        .from('user_sessions')
        .whereBetween('last_activity', [weekAgo, endOfDayDate])
        .first();

      const wauMetric: Partial<UserActivityMetric> = {
        time: startOfDayDate,
        metric_type: 'WAU',
        total_users: parseInt(wau?.count as string) || 0,
        new_users: 0,
        active_traders: 0,
        verified_users: 0,
      };

      await analyticsDb('user_activity_metrics')
        .insert(wauMetric)
        .onConflict(['time', 'metric_type'])
        .merge();

      // Monthly Active Users (MAU)
      const monthAgo = subDays(date, 30);
      const mau = await authDb
        .countDistinct('user_id as count')
        .from('user_sessions')
        .whereBetween('last_activity', [monthAgo, endOfDayDate])
        .first();

      const mauMetric: Partial<UserActivityMetric> = {
        time: startOfDayDate,
        metric_type: 'MAU',
        total_users: parseInt(mau?.count as string) || 0,
        new_users: 0,
        active_traders: 0,
        verified_users: 0,
      };

      await analyticsDb('user_activity_metrics')
        .insert(mauMetric)
        .onConflict(['time', 'metric_type'])
        .merge();

      logger.info('User activity metrics ETL completed');
    } catch (error) {
      logger.error('User activity metrics ETL failed', error);
      throw error;
    }
  }

  async extractCohortAnalysis(): Promise<void> {
    try {
      logger.info('Starting cohort analysis ETL');

      // Get cohorts from the last 90 days
      const cohortStartDate = subDays(new Date(), 90);

      const cohorts = await authDb
        .select(
          authDb.raw("DATE(created_at) as cohort_date"),
          authDb.raw('COUNT(*) as total_users')
        )
        .from('users')
        .where('created_at', '>=', cohortStartDate)
        .groupBy(authDb.raw('DATE(created_at)'));

      for (const cohort of cohorts) {
        const cohortDate = new Date(cohort.cohort_date);
        const totalUsers = parseInt(cohort.total_users);

        // Calculate retention for different periods
        const retention1 = await this.calculateRetention(cohortDate, 1);
        const retention7 = await this.calculateRetention(cohortDate, 7);
        const retention30 = await this.calculateRetention(cohortDate, 30);
        const retention90 = await this.calculateRetention(cohortDate, 90);

        // Calculate average lifetime value
        const avgLTV = await this.calculateAverageLTV(cohortDate);

        const cohortData: Partial<UserCohort> = {
          cohort_date: cohortDate,
          cohort_name: `Cohort ${cohortDate.toISOString().split('T')[0]}`,
          total_users: totalUsers,
          retention_day_1: retention1,
          retention_day_7: retention7,
          retention_day_30: retention30,
          retention_day_90: retention90,
          avg_lifetime_value: avgLTV,
        };

        await analyticsDb('user_cohorts')
          .insert(cohortData)
          .onConflict('cohort_date')
          .merge();
      }

      logger.info(`Cohort analysis ETL completed: ${cohorts.length} cohorts processed`);
    } catch (error) {
      logger.error('Cohort analysis ETL failed', error);
      throw error;
    }
  }

  private async calculateRetention(cohortDate: Date, days: number): Promise<number> {
    try {
      const targetDate = new Date(cohortDate.getTime() + days * 24 * 60 * 60 * 1000);
      const targetDateEnd = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

      const cohortUsers = await authDb('users')
        .select('user_id')
        .whereBetween('created_at', [cohortDate, new Date(cohortDate.getTime() + 24 * 60 * 60 * 1000)])
        .pluck('user_id');

      if (cohortUsers.length === 0) return 0;

      const activeUsers = await authDb('user_sessions')
        .countDistinct('user_id as count')
        .whereIn('user_id', cohortUsers)
        .whereBetween('last_activity', [targetDate, targetDateEnd])
        .first();

      const activeCount = parseInt(activeUsers?.count as string) || 0;
      return activeCount;
    } catch (error) {
      logger.error('Error calculating retention', error);
      return 0;
    }
  }

  private async calculateAverageLTV(cohortDate: Date): Promise<number> {
    try {
      const cohortEndDate = new Date(cohortDate.getTime() + 24 * 60 * 60 * 1000);

      const cohortUsers = await authDb('users')
        .select('user_id')
        .whereBetween('created_at', [cohortDate, cohortEndDate])
        .pluck('user_id');

      if (cohortUsers.length === 0) return 0;

      const totalRevenue = await tradingDb('trades')
        .sum('fee as total_fee')
        .whereIn('user_id', cohortUsers)
        .first();

      const totalFee = parseFloat(totalRevenue?.total_fee) || 0;
      return totalFee / cohortUsers.length;
    } catch (error) {
      logger.error('Error calculating LTV', error);
      return 0;
    }
  }

  async generateChurnPredictions(): Promise<void> {
    try {
      logger.info('Starting churn prediction generation');

      // Get users who haven't traded in the last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30);
      const sevenDaysAgo = subDays(new Date(), 7);

      const inactiveUsers = await authDb('users')
        .select('user_id', 'created_at', 'last_login_at')
        .whereNotExists(function () {
          this.select('*')
            .from('trades')
            .whereRaw('trades.user_id = users.user_id')
            .where('created_at', '>=', thirtyDaysAgo);
        })
        .where('created_at', '<', thirtyDaysAgo);

      for (const user of inactiveUsers) {
        const daysSinceRegistration = differenceInDays(new Date(), new Date(user.created_at));
        const daysSinceLastLogin = user.last_login_at
          ? differenceInDays(new Date(), new Date(user.last_login_at))
          : daysSinceRegistration;

        // Simple churn probability calculation (can be replaced with ML model)
        let churnProbability = 0;
        if (daysSinceLastLogin > 60) {
          churnProbability = 0.9;
        } else if (daysSinceLastLogin > 45) {
          churnProbability = 0.7;
        } else if (daysSinceLastLogin > 30) {
          churnProbability = 0.5;
        } else {
          churnProbability = 0.3;
        }

        const riskLevel = churnProbability >= 0.7 ? 'high' : churnProbability >= 0.4 ? 'medium' : 'low';

        const prediction: Partial<ChurnPrediction> = {
          user_id: user.user_id,
          churn_probability: churnProbability,
          risk_level: riskLevel as 'low' | 'medium' | 'high',
          factors: {
            days_since_last_login: daysSinceLastLogin,
            days_since_registration: daysSinceRegistration,
          },
          status: 'active',
        };

        await analyticsDb('churn_predictions')
          .insert(prediction)
          .onConflict('user_id')
          .merge();
      }

      logger.info(`Churn predictions generated for ${inactiveUsers.length} users`);
    } catch (error) {
      logger.error('Churn prediction generation failed', error);
      throw error;
    }
  }

  async runFullETL(): Promise<void> {
    const today = new Date();
    
    await Promise.all([
      this.extractUserActivityMetrics(today),
      this.extractCohortAnalysis(),
      this.generateChurnPredictions(),
    ]);

    logger.info('Full user ETL completed');
  }
}
