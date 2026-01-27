import { analyticsDb } from '../config/database';
import { UserAnalytics, UserCohort, ChurnPrediction } from '../models/types';
import { logger } from '../utils/logger';
import { CacheService } from './cache-service';

export class UserAnalyticsService {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  async getUserAnalytics(startDate: Date, endDate: Date): Promise<UserAnalytics> {
    const cacheKey = `user:analytics:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.cacheService.get<UserAnalytics>(cacheKey);
    if (cached) return cached;

    try {
      // Cohort analysis
      const cohortAnalysis = await analyticsDb('user_cohorts')
        .whereBetween('cohort_date', [startDate, endDate])
        .orderBy('cohort_date', 'desc');

      // Behavior patterns
      const behaviorPatterns = await analyticsDb('user_behavior_patterns')
        .select('pattern_type')
        .count('* as count')
        .whereBetween('detected_at', [startDate, endDate])
        .groupBy('pattern_type');

      const patterns: Record<string, any> = {};
      behaviorPatterns.forEach((bp) => {
        patterns[bp.pattern_type] = parseInt(bp.count as string);
      });

      // Churn predictions
      const churnPredictions = await analyticsDb('churn_predictions')
        .where('status', 'active')
        .orderBy('churn_probability', 'desc')
        .limit(100);

      // Lifetime value distribution
      const ltvData = await analyticsDb('user_cohorts')
        .select('avg_lifetime_value')
        .orderBy('avg_lifetime_value', 'desc');

      const ltvValues = ltvData.map((d) => parseFloat(d.avg_lifetime_value));
      const avgLTV = ltvValues.reduce((sum, val) => sum + val, 0) / ltvValues.length || 0;
      const sortedLTV = [...ltvValues].sort((a, b) => a - b);
      const medianLTV = sortedLTV[Math.floor(sortedLTV.length / 2)] || 0;

      const ltvDistribution: Record<string, number> = {
        '0-100': ltvValues.filter((v) => v < 100).length,
        '100-500': ltvValues.filter((v) => v >= 100 && v < 500).length,
        '500-1000': ltvValues.filter((v) => v >= 500 && v < 1000).length,
        '1000+': ltvValues.filter((v) => v >= 1000).length,
      };

      // User segmentation (simplified)
      const segmentation = await analyticsDb('trading_volume_metrics')
        .select('user_level as segment')
        .count('* as user_count')
        .sum('total_volume as total_volume')
        .whereBetween('time', [startDate, endDate])
        .whereNotNull('user_level')
        .groupBy('user_level');

      const analytics: UserAnalytics = {
        cohort_analysis: cohortAnalysis.map((c) => ({
          cohort_id: c.cohort_id,
          cohort_date: c.cohort_date,
          cohort_name: c.cohort_name,
          total_users: c.total_users,
          retention_day_1: c.retention_day_1,
          retention_day_7: c.retention_day_7,
          retention_day_30: c.retention_day_30,
          retention_day_90: c.retention_day_90,
          avg_lifetime_value: parseFloat(c.avg_lifetime_value),
          created_at: c.created_at,
        })),
        behavior_patterns: patterns,
        churn_predictions: churnPredictions.map((cp) => ({
          prediction_id: cp.prediction_id,
          user_id: cp.user_id,
          churn_probability: parseFloat(cp.churn_probability),
          risk_level: cp.risk_level,
          factors: cp.factors || {},
          predicted_at: cp.predicted_at,
          status: cp.status,
        })),
        lifetime_value: {
          avg: avgLTV,
          median: medianLTV,
          distribution: ltvDistribution,
        },
        segmentation: segmentation.map((s) => ({
          segment: s.segment,
          user_count: parseInt(s.user_count as string),
          avg_volume: 0, // Would calculate
          avg_revenue: 0, // Would calculate
        })),
      };

      await this.cacheService.set(cacheKey, analytics, 600); // Cache for 10 minutes
      return analytics;
    } catch (error) {
      logger.error('Error getting user analytics', error);
      throw error;
    }
  }

  async getCohortAnalysis(startDate: Date, endDate: Date): Promise<UserCohort[]> {
    try {
      const cohorts = await analyticsDb('user_cohorts')
        .whereBetween('cohort_date', [startDate, endDate])
        .orderBy('cohort_date', 'desc');

      return cohorts.map((c) => ({
        cohort_id: c.cohort_id,
        cohort_date: c.cohort_date,
        cohort_name: c.cohort_name,
        total_users: c.total_users,
        retention_day_1: c.retention_day_1,
        retention_day_7: c.retention_day_7,
        retention_day_30: c.retention_day_30,
        retention_day_90: c.retention_day_90,
        avg_lifetime_value: parseFloat(c.avg_lifetime_value),
        created_at: c.created_at,
      }));
    } catch (error) {
      logger.error('Error getting cohort analysis', error);
      throw error;
    }
  }

  async getChurnPredictions(riskLevel?: string): Promise<ChurnPrediction[]> {
    try {
      let query = analyticsDb('churn_predictions')
        .where('status', 'active')
        .orderBy('churn_probability', 'desc');

      if (riskLevel) {
        query = query.where('risk_level', riskLevel);
      }

      const predictions = await query.limit(1000);

      return predictions.map((p) => ({
        prediction_id: p.prediction_id,
        user_id: p.user_id,
        churn_probability: parseFloat(p.churn_probability),
        risk_level: p.risk_level,
        factors: p.factors || {},
        predicted_at: p.predicted_at,
        status: p.status,
      }));
    } catch (error) {
      logger.error('Error getting churn predictions', error);
      throw error;
    }
  }

  async getUserActivity(startDate: Date, endDate: Date, metricType?: string): Promise<any[]> {
    try {
      let query = analyticsDb('user_activity_metrics')
        .whereBetween('time', [startDate, endDate])
        .orderBy('time', 'asc');

      if (metricType) {
        query = query.where('metric_type', metricType);
      }

      return await query;
    } catch (error) {
      logger.error('Error getting user activity', error);
      throw error;
    }
  }

  async getConversionFunnel(funnelName: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const funnelData = await analyticsDb('conversion_funnels')
        .where('funnel_name', funnelName)
        .whereBetween('measured_date', [startDate, endDate])
        .orderBy('measured_date', 'desc')
        .first();

      if (!funnelData) {
        return null;
      }

      return {
        funnel_name: funnelData.funnel_name,
        measured_date: funnelData.measured_date,
        steps: [
          { step: 1, count: funnelData.step_1_count, name: 'Landing Page' },
          { step: 2, count: funnelData.step_2_count, name: 'Registration' },
          { step: 3, count: funnelData.step_3_count, name: 'KYC Submission' },
          { step: 4, count: funnelData.step_4_count, name: 'First Deposit' },
          { step: 5, count: funnelData.step_5_count, name: 'First Trade' },
        ],
        conversion_rate: parseFloat(funnelData.conversion_rate),
        drop_off_data: funnelData.drop_off_data || {},
      };
    } catch (error) {
      logger.error('Error getting conversion funnel', error);
      throw error;
    }
  }
}
