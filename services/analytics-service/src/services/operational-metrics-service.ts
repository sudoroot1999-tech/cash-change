import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';

interface OperationalMetrics {
  systemUptime: number;
  avgApiResponseTime: number;
  maxApiResponseTime: number;
  apiRequestsTotal: number;
  apiRequestsSuccess: number;
  apiRequestsError: number;
  orderMatchingLatency: number;
  databaseQueryTime: number;
  errorRate: number;
  cacheHitRate: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
}

interface SupportMetrics {
  ticketsCreated: number;
  ticketsResolved: number;
  ticketsOpen: number;
  avgResolutionTime: number;
  avgFirstResponseTime: number;
  customerSatisfaction: number;
  highPriorityTickets: number;
  mediumPriorityTickets: number;
  lowPriorityTickets: number;
}

interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  queueLength: number;
}

export class OperationalMetricsService {
  private db: Pool;
  private cache: RedisClientType;
  private logger: any;
  private readonly CACHE_TTL = 60; // 1 minute for operational metrics

  constructor(db: Pool, cache: RedisClientType) {
    this.db = db;
    this.cache = cache;
    this.logger = logger;
  }

  /**
   * Get comprehensive operational metrics
   */
  async getOperationalMetrics(hours: number = 24): Promise<OperationalMetrics> {
    try {
      const query = `
        SELECT 
          AVG(system_uptime_pct) as system_uptime,
          AVG(avg_api_response_time) as avg_api_response_time,
          MAX(max_api_response_time) as max_api_response_time,
          SUM(api_requests_total) as api_requests_total,
          SUM(api_requests_success) as api_requests_success,
          SUM(api_requests_error) as api_requests_error,
          AVG(order_matching_latency) as order_matching_latency,
          AVG(database_query_time) as database_query_time,
          AVG(error_rate) as error_rate,
          AVG(cache_hit_rate) as cache_hit_rate,
          AVG(cpu_usage) as cpu_usage,
          AVG(memory_usage) as memory_usage,
          AVG(disk_usage) as disk_usage
        FROM metrics_hourly_operational
        WHERE time >= NOW() - INTERVAL '${hours} hours'
      `;

      const result = await this.db.query(query);
      const row = result.rows[0];

      return {
        systemUptime: parseFloat(row.system_uptime) || 0,
        avgApiResponseTime: parseFloat(row.avg_api_response_time) || 0,
        maxApiResponseTime: parseFloat(row.max_api_response_time) || 0,
        apiRequestsTotal: parseInt(row.api_requests_total) || 0,
        apiRequestsSuccess: parseInt(row.api_requests_success) || 0,
        apiRequestsError: parseInt(row.api_requests_error) || 0,
        orderMatchingLatency: parseFloat(row.order_matching_latency) || 0,
        databaseQueryTime: parseFloat(row.database_query_time) || 0,
        errorRate: parseFloat(row.error_rate) || 0,
        cacheHitRate: parseFloat(row.cache_hit_rate) || 0,
        cpuUsage: parseFloat(row.cpu_usage) || 0,
        memoryUsage: parseFloat(row.memory_usage) || 0,
        diskUsage: parseFloat(row.disk_usage) || 0,
      };
    } catch (error) {
      this.logger.error('Error fetching operational metrics', error);
      throw error;
    }
  }

  /**
   * Get support metrics
   */
  async getSupportMetrics(days: number = 7): Promise<SupportMetrics> {
    try {
      const query = `
        SELECT 
          SUM(tickets_created) as tickets_created,
          SUM(tickets_resolved) as tickets_resolved,
          AVG(tickets_open) as tickets_open,
          AVG(avg_resolution_time) as avg_resolution_time,
          AVG(avg_first_response_time) as avg_first_response_time,
          AVG(customer_satisfaction) as customer_satisfaction,
          AVG(tickets_by_priority_high) as high_priority,
          AVG(tickets_by_priority_medium) as medium_priority,
          AVG(tickets_by_priority_low) as low_priority
        FROM metrics_daily_support
        WHERE time >= NOW() - INTERVAL '${days} days'
      `;

      const result = await this.db.query(query);
      const row = result.rows[0];

      return {
        ticketsCreated: parseInt(row.tickets_created) || 0,
        ticketsResolved: parseInt(row.tickets_resolved) || 0,
        ticketsOpen: Math.round(parseFloat(row.tickets_open)) || 0,
        avgResolutionTime: parseFloat(row.avg_resolution_time) || 0,
        avgFirstResponseTime: parseFloat(row.avg_first_response_time) || 0,
        customerSatisfaction: parseFloat(row.customer_satisfaction) || 0,
        highPriorityTickets: Math.round(parseFloat(row.high_priority)) || 0,
        mediumPriorityTickets: Math.round(parseFloat(row.medium_priority)) || 0,
        lowPriorityTickets: Math.round(parseFloat(row.low_priority)) || 0,
      };
    } catch (error) {
      this.logger.error('Error fetching support metrics', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealthStatus(): Promise<SystemHealthStatus> {
    const cacheKey = 'system_health_status';
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get latest metrics
      const metricsResult = await this.db.query(`
        SELECT 
          system_uptime_pct,
          avg_api_response_time,
          error_rate
        FROM metrics_hourly_operational
        ORDER BY time DESC
        LIMIT 1
      `);

      const metrics = metricsResult.rows[0] || {};
      const uptime = parseFloat(metrics.system_uptime_pct) || 100;
      const responseTime = parseFloat(metrics.avg_api_response_time) || 0;
      const errorRate = parseFloat(metrics.error_rate) || 0;

      // Get active connections (from application layer)
      const activeConnections = 0; // Would be populated from monitoring

      // Get queue length
      const queueResult = await this.db.query(
        'SELECT COUNT(*) as count FROM job_queue WHERE status = $1',
        ['pending']
      );
      const queueLength = parseInt(queueResult.rows[0]?.count) || 0;

      // Determine health status
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (uptime < 99.0 || errorRate > 5 || responseTime > 2000) {
        status = 'critical';
      } else if (uptime < 99.9 || errorRate > 1 || responseTime > 1000) {
        status = 'degraded';
      }

      const healthStatus: SystemHealthStatus = {
        status,
        uptime,
        responseTime,
        errorRate,
        activeConnections,
        queueLength,
      };

      await this.cache.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(healthStatus));
      return healthStatus;
    } catch (error) {
      this.logger.error('Error fetching system health status', error);
      throw error;
    }
  }

  /**
   * Get API performance trends
   */
  async getApiPerformanceTrends(hours: number = 24): Promise<any[]> {
    try {
      const query = `
        SELECT 
          time_bucket('1 hour', time) as hour,
          AVG(avg_api_response_time) as avg_response_time,
          MAX(max_api_response_time) as max_response_time,
          SUM(api_requests_total) as total_requests,
          AVG(error_rate) as error_rate
        FROM metrics_hourly_operational
        WHERE time >= NOW() - INTERVAL '${hours} hours'
        GROUP BY hour
        ORDER BY hour ASC
      `;

      const result = await this.db.query(query);

      return result.rows.map(row => ({
        hour: row.hour,
        avgResponseTime: parseFloat(row.avg_response_time) || 0,
        maxResponseTime: parseFloat(row.max_response_time) || 0,
        totalRequests: parseInt(row.total_requests) || 0,
        errorRate: parseFloat(row.error_rate) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching API performance trends', error);
      throw error;
    }
  }

  /**
   * Get error rate analysis
   */
  async getErrorRateAnalysis(days: number = 7): Promise<any> {
    try {
      const query = `
        WITH error_stats AS (
          SELECT 
            time_bucket('1 day', time) as day,
            AVG(error_rate) as avg_error_rate,
            SUM(api_requests_error) as total_errors
          FROM metrics_hourly_operational
          WHERE time >= NOW() - INTERVAL '${days} days'
          GROUP BY day
        )
        SELECT 
          AVG(avg_error_rate) as overall_error_rate,
          MAX(avg_error_rate) as max_error_rate,
          MIN(avg_error_rate) as min_error_rate,
          SUM(total_errors) as total_errors
        FROM error_stats
      `;

      const result = await this.db.query(query);
      const row = result.rows[0];

      return {
        overallErrorRate: parseFloat(row.overall_error_rate) || 0,
        maxErrorRate: parseFloat(row.max_error_rate) || 0,
        minErrorRate: parseFloat(row.min_error_rate) || 0,
        totalErrors: parseInt(row.total_errors) || 0,
      };
    } catch (error) {
      this.logger.error('Error fetching error rate analysis', error);
      throw error;
    }
  }

  /**
   * Get uptime report
   */
  async getUptimeReport(days: number = 30): Promise<any> {
    try {
      const query = `
        SELECT 
          AVG(system_uptime_pct) as avg_uptime,
          MIN(system_uptime_pct) as min_uptime,
          COUNT(CASE WHEN system_uptime_pct < 99.9 THEN 1 END) as incidents
        FROM metrics_hourly_operational
        WHERE time >= NOW() - INTERVAL '${days} days'
      `;

      const result = await this.db.query(query);
      const row = result.rows[0];

      const avgUptime = parseFloat(row.avg_uptime) || 0;
      const downtime = (100 - avgUptime) / 100 * days * 24 * 60; // in minutes

      return {
        avgUptime,
        minUptime: parseFloat(row.min_uptime) || 0,
        incidents: parseInt(row.incidents) || 0,
        downtimeMinutes: downtime,
        slaTarget: 99.9,
        slaStatus: avgUptime >= 99.9 ? 'met' : 'missed',
      };
    } catch (error) {
      this.logger.error('Error fetching uptime report', error);
      throw error;
    }
  }

  /**
   * Calculate and store operational metrics (for ETL process)
   */
  async calculateAndStoreOperationalMetrics(timestamp: Date): Promise<void> {
    try {
      this.logger.info(`Calculating operational metrics for ${timestamp.toISOString()}`);

      // In a real implementation, these would be gathered from monitoring systems
      // For now, we'll use placeholders

      const systemUptime = 99.95;
      const avgApiResponseTime = 150;
      const maxApiResponseTime = 850;
      const apiRequestsTotal = 50000;
      const apiRequestsSuccess = 49800;
      const apiRequestsError = 200;
      const orderMatchingLatency = 5;
      const databaseQueryTime = 25;
      const errorRate = (apiRequestsError / apiRequestsTotal) * 100;
      const cacheHitRate = 85.5;
      const cpuUsage = 45.2;
      const memoryUsage = 62.8;
      const diskUsage = 38.5;

      const insertQuery = `
        INSERT INTO metrics_hourly_operational (
          time, system_uptime_pct, avg_api_response_time, max_api_response_time,
          api_requests_total, api_requests_success, api_requests_error,
          order_matching_latency, database_query_time, error_rate,
          cache_hit_rate, cpu_usage, memory_usage, disk_usage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (time) DO UPDATE SET
          system_uptime_pct = EXCLUDED.system_uptime_pct,
          avg_api_response_time = EXCLUDED.avg_api_response_time,
          max_api_response_time = EXCLUDED.max_api_response_time,
          api_requests_total = EXCLUDED.api_requests_total,
          api_requests_success = EXCLUDED.api_requests_success,
          api_requests_error = EXCLUDED.api_requests_error,
          order_matching_latency = EXCLUDED.order_matching_latency,
          database_query_time = EXCLUDED.database_query_time,
          error_rate = EXCLUDED.error_rate,
          cache_hit_rate = EXCLUDED.cache_hit_rate,
          cpu_usage = EXCLUDED.cpu_usage,
          memory_usage = EXCLUDED.memory_usage,
          disk_usage = EXCLUDED.disk_usage
      `;

      await this.db.query(insertQuery, [
        timestamp,
        systemUptime,
        avgApiResponseTime,
        maxApiResponseTime,
        apiRequestsTotal,
        apiRequestsSuccess,
        apiRequestsError,
        orderMatchingLatency,
        databaseQueryTime,
        errorRate,
        cacheHitRate,
        cpuUsage,
        memoryUsage,
        diskUsage,
      ]);

      this.logger.info(`Operational metrics calculated and stored for ${timestamp.toISOString()}`);
    } catch (error) {
      this.logger.error('Error calculating operational metrics', error);
      throw error;
    }
  }
}
