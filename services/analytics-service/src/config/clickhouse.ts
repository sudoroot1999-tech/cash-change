import { createClient, ClickHouseClient } from '@clickhouse/client';
import { logger } from '../utils/logger';

let clickhouseClient: ClickHouseClient | null = null;

export function getClickHouseClient(): ClickHouseClient {
  if (!clickhouseClient) {
    clickhouseClient = createClient({
      host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: process.env.CLICKHOUSE_DB || 'analytics',
      request_timeout: 30000,
      compression: {
        request: true,
        response: true,
      },
    });

    logger.info('ClickHouse client initialized');
  }

  return clickhouseClient;
}

/**
 * Initialize ClickHouse database and tables
 */
export async function initializeClickHouse(): Promise<void> {
  const client = getClickHouseClient();

  try {
    // Create database if not exists
    await client.exec({
      query: `CREATE DATABASE IF NOT EXISTS ${process.env.CLICKHOUSE_DB || 'analytics'}`,
    });

    // Create user_events table
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS user_events (
          event_id String,
          user_id String,
          event_type String,
          event_category Enum8('navigation'=1, 'transaction'=2, 'interaction'=3, 'system'=4),
          properties String,
          timestamp DateTime64(3),
          session_id String,
          ip_address String,
          user_agent String,
          device_type String,
          page_url String,
          date Date DEFAULT toDate(timestamp)
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(date)
        ORDER BY (date, user_id, timestamp)
        TTL date + INTERVAL 2 YEAR
        SETTINGS index_granularity = 8192
      `,
    });

    // Create transaction_events table
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS transaction_events (
          event_id String,
          user_id String,
          transaction_type Enum8('deposit'=1, 'withdrawal'=2, 'trade'=3, 'transfer'=4),
          amount Decimal64(8),
          currency String,
          status String,
          metadata String,
          timestamp DateTime64(3),
          date Date DEFAULT toDate(timestamp)
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(date)
        ORDER BY (date, user_id, timestamp)
        TTL date + INTERVAL 2 YEAR
        SETTINGS index_granularity = 8192
      `,
    });

    // Create trading_events table
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS trading_events (
          event_id String,
          user_id String,
          trading_pair String,
          order_type Enum8('market'=1, 'limit'=2, 'stop_loss'=3, 'stop_limit'=4),
          side Enum8('buy'=1, 'sell'=2),
          amount Decimal64(8),
          price Nullable(Decimal64(8)),
          filled_amount Nullable(Decimal64(8)),
          status String,
          timestamp DateTime64(3),
          date Date DEFAULT toDate(timestamp)
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(date)
        ORDER BY (date, trading_pair, timestamp)
        TTL date + INTERVAL 2 YEAR
        SETTINGS index_granularity = 8192
      `,
    });

    // Create system_metrics table
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS system_metrics (
          metric_id String,
          metric_name String,
          metric_value Float64,
          service String,
          tags String,
          timestamp DateTime64(3),
          date Date DEFAULT toDate(timestamp)
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(date)
        ORDER BY (date, service, metric_name, timestamp)
        TTL date + INTERVAL 1 YEAR
        SETTINGS index_granularity = 8192
      `,
    });

    // Create materialized views for common aggregations
    
    // Daily user activity
    await client.exec({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS user_activity_daily
        ENGINE = SummingMergeTree()
        PARTITION BY toYYYYMM(date)
        ORDER BY (date, user_id)
        AS SELECT
          toDate(timestamp) as date,
          user_id,
          event_type,
          count() as event_count
        FROM user_events
        GROUP BY date, user_id, event_type
      `,
    });

    // Hourly trading volume
    await client.exec({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS trading_volume_hourly
        ENGINE = SummingMergeTree()
        PARTITION BY toYYYYMM(date)
        ORDER BY (date, hour, trading_pair)
        AS SELECT
          toDate(timestamp) as date,
          toHour(timestamp) as hour,
          trading_pair,
          side,
          sum(amount) as volume,
          count() as trade_count,
          avg(price) as avg_price
        FROM trading_events
        WHERE status = 'completed'
        GROUP BY date, hour, trading_pair, side
      `,
    });

    // Daily revenue
    await client.exec({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS revenue_daily
        ENGINE = SummingMergeTree()
        PARTITION BY toYYYYMM(date)
        ORDER BY (date, currency)
        AS SELECT
          toDate(timestamp) as date,
          transaction_type,
          currency,
          sum(amount) as total_amount,
          count() as transaction_count
        FROM transaction_events
        WHERE status = 'completed'
        GROUP BY date, transaction_type, currency
      `,
    });

    logger.info('ClickHouse tables and views created successfully');

  } catch (error) {
    logger.error('Error initializing ClickHouse', error);
    throw error;
  }
}

/**
 * Execute ClickHouse query
 */
export async function clickhouseQuery<T = any>(query: string, params?: Record<string, any>): Promise<T[]> {
  const client = getClickHouseClient();
  
  try {
    const resultSet = await client.query({
      query,
      query_params: params,
      format: 'JSONEachRow',
    });

    const data = await resultSet.json<T>();
    return data as T[];
  } catch (error) {
    logger.error('ClickHouse query error', { query, error });
    throw error;
  }
}

/**
 * Execute ClickHouse insert
 */
export async function clickhouseInsert(table: string, data: any[]): Promise<void> {
  const client = getClickHouseClient();
  
  try {
    await client.insert({
      table,
      values: data,
      format: 'JSONEachRow',
    });
  } catch (error) {
    logger.error('ClickHouse insert error', { table, error });
    throw error;
  }
}

/**
 * Close ClickHouse connection
 */
export async function closeClickHouse(): Promise<void> {
  if (clickhouseClient) {
    await clickhouseClient.close();
    clickhouseClient = null;
    logger.info('ClickHouse connection closed');
  }
}

/**
 * ClickHouse service for analytics queries
 */
export class ClickHouseService {
  
  /**
   * Get daily active users
   */
  async getDailyActiveUsers(startDate: Date, endDate: Date): Promise<any[]> {
    return clickhouseQuery(`
      SELECT 
        date,
        count(DISTINCT user_id) as dau
      FROM user_events
      WHERE date BETWEEN {start:Date} AND {end:Date}
      GROUP BY date
      ORDER BY date
    `, { start: startDate, end: endDate });
  }

  /**
   * Get trading volume by pair
   */
  async getTradingVolume(pair: string, startDate: Date, endDate: Date): Promise<any[]> {
    return clickhouseQuery(`
      SELECT 
        date,
        hour,
        sum(volume) as total_volume,
        sum(trade_count) as trades,
        avg(avg_price) as avg_price
      FROM trading_volume_hourly
      WHERE trading_pair = {pair:String}
        AND date BETWEEN {start:Date} AND {end:Date}
      GROUP BY date, hour
      ORDER BY date, hour
    `, { pair, start: startDate, end: endDate });
  }

  /**
   * Get user cohort data
   */
  async getUserCohort(cohortDate: Date): Promise<any[]> {
    return clickhouseQuery(`
      WITH first_activity AS (
        SELECT user_id, min(date) as cohort_date
        FROM user_events
        GROUP BY user_id
      )
      SELECT 
        cohort_date,
        dateDiff('day', cohort_date, e.date) as days_since_signup,
        count(DISTINCT e.user_id) as active_users
      FROM user_events e
      INNER JOIN first_activity fa ON e.user_id = fa.user_id
      WHERE fa.cohort_date = {cohort:Date}
      GROUP BY cohort_date, days_since_signup
      ORDER BY days_since_signup
    `, { cohort: cohortDate });
  }

  /**
   * Get revenue breakdown
   */
  async getRevenueBreakdown(startDate: Date, endDate: Date): Promise<any[]> {
    return clickhouseQuery(`
      SELECT 
        date,
        transaction_type,
        currency,
        sum(total_amount) as revenue,
        sum(transaction_count) as transactions
      FROM revenue_daily
      WHERE date BETWEEN {start:Date} AND {end:Date}
      GROUP BY date, transaction_type, currency
      ORDER BY date, revenue DESC
    `, { start: startDate, end: endDate });
  }

  /**
   * Get top trading pairs
   */
  async getTopTradingPairs(limit: number = 10): Promise<any[]> {
    return clickhouseQuery(`
      SELECT 
        trading_pair,
        sum(volume) as total_volume,
        sum(trade_count) as total_trades,
        avg(avg_price) as avg_price
      FROM trading_volume_hourly
      WHERE date >= today() - 7
      GROUP BY trading_pair
      ORDER BY total_volume DESC
      LIMIT {limit:UInt32}
    `, { limit });
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagement(userId: string, days: number = 30): Promise<any> {
    const result = await clickhouseQuery(`
      SELECT 
        count() as total_events,
        count(DISTINCT date) as active_days,
        count(DISTINCT session_id) as sessions,
        countIf(event_type = 'page_view') as page_views,
        countIf(event_category = 'transaction') as transactions
      FROM user_events
      WHERE user_id = {user:String}
        AND date >= today() - {days:UInt32}
    `, { user: userId, days });

    return result[0] || {};
  }

  /**
   * Get funnel conversion rates
   */
  async getFunnelConversion(steps: string[]): Promise<any[]> {
    const stepConditions = steps.map((step, idx) => 
      `countIf(event_type = '${step}') as step_${idx}`
    ).join(',\n        ');

    return clickhouseQuery(`
      SELECT 
        date,
        ${stepConditions}
      FROM user_events
      WHERE date >= today() - 30
        AND event_type IN (${steps.map(s => `'${s}'`).join(', ')})
      GROUP BY date
      ORDER BY date
    `);
  }
}

export const clickhouseService = new ClickHouseService();
