import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { clickhouseService, clickhouseQuery } from '../../config/clickhouse';
import { eventTrackingService } from '../../services/event-tracking-service';
import { redisClient } from '../../config/redis';
import { logger } from '../../utils/logger';
import { query } from '../../config/database';

const redis = redisClient;

/**
 * GET /api/analytics/metrics/summary
 * Real-time metrics summary
 */
export async function getMetricsSummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const period = req.query.period as string || '24h';
    
    // Get cached data first
    const cacheKey = `metrics:summary:${period}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      res.json({ success: true, data: JSON.parse(cached), cached: true });
      return;
    }
    
    // Calculate date range
    const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // Fetch metrics in parallel
    const [
      userMetrics,
      tradingMetrics,
      revenueMetrics,
      systemMetrics
    ] = await Promise.all([
      getUserMetrics(startDate),
      getTradingMetrics(startDate),
      getRevenueMetrics(startDate),
      getSystemMetrics(startDate)
    ]);
    
    const summary = {
      period,
      timestamp: new Date().toISOString(),
      users: userMetrics,
      trading: tradingMetrics,
      revenue: revenueMetrics,
      system: systemMetrics,
    };
    
    // Cache for 1 minute
    await redis.setex(cacheKey, 60, JSON.stringify(summary));
    
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Error getting metrics summary', error);
    res.status(500).json({ success: false, error: 'Failed to fetch metrics summary' });
  }
}

/**
 * GET /api/analytics/users/growth
 * User growth metrics with trends
 */
export async function getUserSegmentation(req: AuthRequest, res: Response): Promise<any> {
  try {
    const { start_date, end_date, granularity = 'day' } = req.query;
    
    const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date as string) : new Date();
    
    // Get daily/hourly user counts
    const dau = await clickhouseService.getDailyActiveUsers(startDate, endDate);
    
    // Get new registrations
    const registrations = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM users
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [startDate, endDate]);
    
    // Calculate MAU
    const mauResult = await query(`
      SELECT COUNT(DISTINCT user_id) as mau
      FROM user_events
      WHERE timestamp >= NOW() - INTERVAL '30 days'
    `);
    
    // Calculate retention rate
    const retentionResult = await query(`
      WITH first_activity AS (
        SELECT user_id, MIN(DATE(timestamp)) as first_date
        FROM user_events
        GROUP BY user_id
      )
      SELECT 
        AVG(CASE 
          WHEN EXISTS (
            SELECT 1 FROM user_events ue2 
            WHERE ue2.user_id = fa.user_id 
            AND DATE(ue2.timestamp) = fa.first_date + INTERVAL '7 days'
          ) THEN 1 ELSE 0 
        END) as day_7_retention,
        AVG(CASE 
          WHEN EXISTS (
            SELECT 1 FROM user_events ue2 
            WHERE ue2.user_id = fa.user_id 
            AND DATE(ue2.timestamp) = fa.first_date + INTERVAL '30 days'
          ) THEN 1 ELSE 0 
        END) as day_30_retention
      FROM first_activity fa
      WHERE fa.first_date >= CURRENT_DATE - INTERVAL '60 days'
    `);
    
    // Calculate growth rate
    const growthRate = registrations.rows.length > 1
      ? ((registrations.rows[registrations.rows.length - 1].new_users - registrations.rows[0].new_users) / 
         registrations.rows[0].new_users * 100)
      : 0;
    
    const response = {
      period: { start: startDate, end: endDate },
      daily_active_users: dau,
      monthly_active_users: parseInt(mauResult.rows[0]?.mau || '0'),
      new_registrations: registrations.rows,
      total_new_users: registrations.rows.reduce((sum: number, row: any) => sum + parseInt(row.new_users), 0),
      growth_rate: growthRate.toFixed(2),
      retention: {
        day_7: (parseFloat(retentionResult.rows[0]?.day_7_retention || '0') * 100).toFixed(2),
        day_30: (parseFloat(retentionResult.rows[0]?.day_30_retention || '0') * 100).toFixed(2),
      },
    };
    
    res.json({ success: true, data: response });
  } catch (error) {
    logger.error('Error getting user growth', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user growth data' });
  }
}

/**
 * GET /api/analytics/trading/volume
 * Trading volume analysis
 */
export async function getTradingVolume(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { pair, start_date, end_date, interval = 'hourly' } = req.query;
    
    const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date as string) : new Date();
    
    let volumeData;
    
    if (pair) {
      // Specific pair
      volumeData = await clickhouseService.getTradingVolume(pair as string, startDate, endDate);
    } else {
      // All pairs
      const topPairs = await clickhouseService.getTopTradingPairs(20);
      volumeData = { top_pairs: topPairs };
    }
    
    // Get maker/taker ratios
    const makerTakerResult = await query(`
      SELECT 
        trading_pair,
        COUNT(CASE WHEN order_type = 'limit' THEN 1 END)::float / COUNT(*) as maker_ratio,
        COUNT(CASE WHEN order_type = 'market' THEN 1 END)::float / COUNT(*) as taker_ratio
      FROM trading_events
      WHERE timestamp BETWEEN $1 AND $2
        AND status = 'completed'
        ${pair ? 'AND trading_pair = $3' : ''}
      GROUP BY trading_pair
    `, pair ? [startDate, endDate, pair] : [startDate, endDate]);
    
    // Get price statistics
    const priceStats = await query(`
      SELECT 
        trading_pair,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        STDDEV(price) as volatility,
        (MAX(price) - MIN(price)) / MIN(price) * 100 as price_range_pct
      FROM trading_events
      WHERE timestamp BETWEEN $1 AND $2
        AND status = 'completed'
        ${pair ? 'AND trading_pair = $3' : ''}
      GROUP BY trading_pair
    `, pair ? [startDate, endDate, pair] : [startDate, endDate]);
    
    const response = {
      period: { start: startDate, end: endDate },
      interval,
      volume_data: volumeData,
      maker_taker_ratios: makerTakerResult.rows,
      price_statistics: priceStats.rows,
    };
    
    res.json({ success: true, data: response });
  } catch (error) {
    logger.error('Error getting trading volume', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trading volume' });
  }
}

/**
 * GET /api/analytics/revenue
 * Revenue analytics
 */
export async function getAnomalyDetection(req: AuthRequest, res: Response): Promise<any> {
  try {
    const { start_date, end_date, breakdown = 'daily' } = req.query;
    
    const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date as string) : new Date();
    
    // Get revenue breakdown from ClickHouse
    const revenueData = await clickhouseService.getRevenueBreakdown(startDate, endDate);
    
    // Get fee revenue details
    const feeRevenue = await query(`
      SELECT 
        DATE(timestamp) as date,
        currency,
        SUM(fee_amount) as total_fees,
        COUNT(*) as transaction_count,
        AVG(fee_amount) as avg_fee
      FROM trading_events
      WHERE timestamp BETWEEN $1 AND $2
        AND status = 'completed'
      GROUP BY DATE(timestamp), currency
      ORDER BY date, total_fees DESC
    `, [startDate, endDate]);
    
    // Calculate revenue by source
    const revenueBySource = await query(`
      SELECT 
        'trading_fees' as source,
        SUM(fee_amount) as revenue
      FROM trading_events
      WHERE timestamp BETWEEN $1 AND $2
        AND status = 'completed'
      UNION ALL
      SELECT 
        'withdrawal_fees' as source,
        SUM(amount * 0.001) as revenue
      FROM transaction_events
      WHERE timestamp BETWEEN $1 AND $2
        AND transaction_type = 'withdrawal'
        AND status = 'completed'
    `, [startDate, endDate]);
    
    const totalRevenue = revenueBySource.rows.reduce((sum: number, row: any) => 
      sum + parseFloat(row.revenue || '0'), 0
    );
    
    const response = {
      period: { start: startDate, end: endDate },
      total_revenue: totalRevenue.toFixed(2),
      revenue_breakdown: revenueData,
      fee_revenue: feeRevenue.rows,
      revenue_by_source: revenueBySource.rows,
    };
    
    res.json({ success: true, data: response });
  } catch (error) {
    logger.error('Error getting revenue data', error);
    res.status(500).json({ success: false, error: 'Failed to fetch revenue data' });
  }
}

/**
 * GET /api/analytics/cohorts
 * Cohort analysis
 */
export async function getCohortAnalysis(req: AuthRequest, res: Response): Promise<any> {
  try {
    const { cohort_date } = req.query;
    
    if (!cohort_date) {
      res.status(400).json({ success: false, error: 'cohort_date is required' });
      return;
    }
    
    const cohortData = await clickhouseService.getUserCohort(new Date(cohort_date as string));
    
    // Calculate retention matrix
    const retentionMatrix: any = {};
    cohortData.forEach((row: any) => {
      if (!retentionMatrix[row.days_since_signup]) {
        retentionMatrix[row.days_since_signup] = row.active_users;
      }
    });
    
    const cohortSize = retentionMatrix[0] || 1;
    const retentionRates = Object.keys(retentionMatrix).map(day => ({
      days: parseInt(day),
      active_users: retentionMatrix[day],
      retention_rate: (retentionMatrix[day] / cohortSize * 100).toFixed(2),
    }));
    
    res.json({
      success: true,
      data: {
        cohort_date,
        cohort_size: cohortSize,
        retention_rates: retentionRates,
      },
    });
  } catch (error) {
    logger.error('Error getting cohort analysis', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cohort analysis' });
  }
}

/**
 * POST /api/analytics/custom-query
 * Execute custom analytics query (admin only)
 */
export async function executeCustomQuery(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { query_type, query_string, parameters } = req.body;
    
    // Validate admin permission (should be checked in middleware)
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }
    
    // Security: Validate query to prevent SQL injection
    // Only allow SELECT queries
    if (!query_string.trim().toLowerCase().startsWith('select')) {
      res.status(400).json({ success: false, error: 'Only SELECT queries are allowed' });
      return;
    }
    
    let results;
    
    if (query_type === 'clickhouse') {
      results = await clickhouseQuery(query_string, parameters);
    } else {
      results = await query(query_string, parameters);
      results = results.rows;
    }
    
    res.json({
      success: true,
      data: {
        row_count: results.length,
        results: results.slice(0, 1000), // Limit to 1000 rows
      },
    });
  } catch (error) {
    logger.error('Error executing custom query', error);
    res.status(500).json({ success: false, error: 'Query execution failed' });
  }
}

/**
 * GET /api/analytics/export/:report_id
 * Export analytics report
 */
export async function exportReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { report_id } = req.params;
    const { format = 'csv' } = req.query;
    
    // Get report data from cache or generate
    const reportKey = `report:${report_id}`;
    const reportData = await redis.get(reportKey);
    
    if (!reportData) {
      res.status(404).json({ success: false, error: 'Report not found or expired' });
      return;
    }
    
    const data = JSON.parse(reportData);
    
    if (format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report_${report_id}.csv"`);
      res.send(csv);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="report_${report_id}.json"`);
      res.json(data);
    } else {
      res.status(400).json({ success: false, error: 'Unsupported format' });
    }
  } catch (error) {
    logger.error('Error exporting report', error);
    res.status(500).json({ success: false, error: 'Failed to export report' });
  }
}

// Helper functions

async function getUserMetrics(startDate: Date) {
  const dau = await eventTrackingService.getEventCounts('user_event', 'daily');
  
  const activeUsers = await query(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM user_events
    WHERE timestamp >= $1
  `, [startDate]);
  
  return {
    daily_active: dau,
    total_active: parseInt(activeUsers.rows[0]?.count || '0'),
  };
}

async function getTradingMetrics(startDate: Date) {
  const result = await query(`
    SELECT 
      COUNT(*) as total_trades,
      SUM(amount) as total_volume,
      COUNT(DISTINCT trading_pair) as active_pairs,
      COUNT(DISTINCT user_id) as active_traders
    FROM trading_events
    WHERE timestamp >= $1
      AND status = 'completed'
  `, [startDate]);
  
  return result.rows[0] || {};
}

async function getRevenueMetrics(startDate: Date) {
  const result = await query(`
    SELECT 
      SUM(fee_amount) as total_fees,
      AVG(fee_amount) as avg_fee,
      COUNT(*) as fee_transactions
    FROM trading_events
    WHERE timestamp >= $1
      AND status = 'completed'
  `, [startDate]);
  
  return result.rows[0] || {};
}

async function getSystemMetrics(startDate: Date) {
  // Get from Redis metrics
  const metrics = await redis.keys('metrics:*');
  
  return {
    metrics_count: metrics.length,
    timestamp: new Date().toISOString(),
  };
}

function convertToCSV(data: any): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value}"` : value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}
