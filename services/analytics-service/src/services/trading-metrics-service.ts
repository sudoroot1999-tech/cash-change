import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';

interface TradingMetrics {
  totalVolume24h: number;
  totalVolume7d: number;
  totalVolume30d: number;
  numberOfTrades: number;
  averageTradeSize: number;
  makerVolume: number;
  takerVolume: number;
  makerTakerRatio: number;
  activeTraders: number;
  newTraders: number;
  avgTradesPerUser: number;
  volumePerUser: number;
}

interface VolumeByPair {
  tradingPair: string;
  volume24h: number;
  volume7d: number;
  volume30d: number;
  tradeCount: number;
  marketShare: number;
  priceChange24h: number;
}

interface TraderDistribution {
  traderType: string;
  count: number;
  volume: number;
  percentage: number;
}

interface TradingFrequency {
  frequency: string;
  userCount: number;
  avgVolume: number;
  totalTrades: number;
}

export class TradingMetricsService {
  private db: Pool;
  private cache: RedisClientType;
  private logger: any;
  private readonly CACHE_TTL = 180; // 3 minutes

  constructor(db: Pool, cache: RedisClientType) {
    this.db = db;
    this.cache = cache;
    this.logger = logger;
  }

  /**
   * Get comprehensive trading metrics
   */
  async getTradingMetrics(startDate: Date, endDate: Date): Promise<TradingMetrics> {
    const cacheKey = `trading_metrics:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const query = `
        SELECT 
          AVG(total_volume_24h) as total_volume_24h,
          AVG(total_volume_7d) as total_volume_7d,
          AVG(total_volume_30d) as total_volume_30d,
          SUM(number_of_trades) as number_of_trades,
          AVG(average_trade_size) as average_trade_size,
          SUM(maker_volume) as maker_volume,
          SUM(taker_volume) as taker_volume,
          AVG(maker_taker_ratio) as maker_taker_ratio,
          AVG(active_traders) as active_traders,
          SUM(new_traders) as new_traders,
          AVG(avg_trades_per_user) as avg_trades_per_user,
          AVG(volume_per_user) as volume_per_user
        FROM metrics_daily_trading
        WHERE time >= $1 AND time <= $2
      `;

      const result = await this.db.query(query, [startDate, endDate]);
      const row = result.rows[0];

      const metrics: TradingMetrics = {
        totalVolume24h: parseFloat(row.total_volume_24h) || 0,
        totalVolume7d: parseFloat(row.total_volume_7d) || 0,
        totalVolume30d: parseFloat(row.total_volume_30d) || 0,
        numberOfTrades: parseInt(row.number_of_trades) || 0,
        averageTradeSize: parseFloat(row.average_trade_size) || 0,
        makerVolume: parseFloat(row.maker_volume) || 0,
        takerVolume: parseFloat(row.taker_volume) || 0,
        makerTakerRatio: parseFloat(row.maker_taker_ratio) || 0,
        activeTraders: Math.round(parseFloat(row.active_traders)) || 0,
        newTraders: parseInt(row.new_traders) || 0,
        avgTradesPerUser: parseFloat(row.avg_trades_per_user) || 0,
        volumePerUser: parseFloat(row.volume_per_user) || 0,
      };

      await this.cache.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));

      return metrics;
    } catch (error) {
      this.logger.error('Error fetching trading metrics', error);
      throw error;
    }
  }

  /**
   * Get volume by trading pair
   */
  async getVolumeByPair(days: number = 30): Promise<VolumeByPair[]> {
    try {
      const query = `
        WITH pair_volumes AS (
          SELECT 
            trading_pair,
            SUM(CASE WHEN time >= NOW() - INTERVAL '1 day' THEN total_volume_24h ELSE 0 END) as volume_24h,
            SUM(CASE WHEN time >= NOW() - INTERVAL '7 days' THEN total_volume_7d ELSE 0 END) as volume_7d,
            SUM(total_volume_30d) as volume_30d,
            SUM(number_of_trades) as trade_count
          FROM metrics_daily_trading
          WHERE time >= NOW() - INTERVAL '${days} days'
          AND trading_pair IS NOT NULL
          GROUP BY trading_pair
        ),
        total_volume AS (
          SELECT SUM(volume_24h) as total FROM pair_volumes
        ),
        price_changes AS (
          SELECT 
            trading_pair,
            ((close_price - open_price) / open_price * 100) as price_change
          FROM price_movements
          WHERE time >= NOW() - INTERVAL '1 day'
        )
        SELECT 
          pv.trading_pair,
          pv.volume_24h,
          pv.volume_7d,
          pv.volume_30d,
          pv.trade_count,
          (pv.volume_24h / NULLIF(tv.total, 0) * 100) as market_share,
          COALESCE(pc.price_change, 0) as price_change_24h
        FROM pair_volumes pv
        CROSS JOIN total_volume tv
        LEFT JOIN price_changes pc ON pv.trading_pair = pc.trading_pair
        ORDER BY pv.volume_24h DESC
      `;

      const result = await this.db.query(query);

      return result.rows.map(row => ({
        tradingPair: row.trading_pair,
        volume24h: parseFloat(row.volume_24h) || 0,
        volume7d: parseFloat(row.volume_7d) || 0,
        volume30d: parseFloat(row.volume_30d) || 0,
        tradeCount: parseInt(row.trade_count) || 0,
        marketShare: parseFloat(row.market_share) || 0,
        priceChange24h: parseFloat(row.price_change_24h) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching volume by pair', error);
      throw error;
    }
  }

  /**
   * Get trading volume trends
   */
  async getVolumeTrends(days: number = 30, granularity: 'hour' | 'day' = 'day'): Promise<any[]> {
    try {
      const bucketSize = granularity === 'hour' ? '1 hour' : '1 day';
      const table = granularity === 'hour' ? 'metrics_hourly_trading' : 'metrics_daily_trading';
      const volumeColumn = granularity === 'hour' ? 'volume' : 'total_volume_24h';

      const query = `
        SELECT 
          time_bucket($1, time) as period,
          SUM(${volumeColumn}) as total_volume,
          SUM(trade_count) as total_trades,
          AVG(unique_traders) as avg_traders
        FROM ${table}
        WHERE time >= NOW() - INTERVAL '${days} days'
        GROUP BY period
        ORDER BY period ASC
      `;

      const result = await this.db.query(query, [bucketSize]);

      return result.rows.map(row => ({
        period: row.period,
        volume: parseFloat(row.total_volume) || 0,
        trades: parseInt(row.total_trades) || 0,
        traders: Math.round(parseFloat(row.avg_traders)) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching volume trends', error);
      throw error;
    }
  }

  /**
   * Get trader distribution by activity level
   */
  async getTraderDistribution(): Promise<TraderDistribution[]> {
    try {
      const query = `
        WITH trader_stats AS (
          SELECT 
            user_id,
            COUNT(*) as trade_count,
            SUM(volume) as total_volume
          FROM trades
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY user_id
        ),
        trader_segments AS (
          SELECT 
            user_id,
            trade_count,
            total_volume,
            CASE
              WHEN trade_count >= 1000 THEN 'High Frequency'
              WHEN trade_count >= 100 THEN 'Active'
              WHEN trade_count >= 10 THEN 'Regular'
              ELSE 'Casual'
            END as trader_type
          FROM trader_stats
        )
        SELECT 
          trader_type,
          COUNT(*) as count,
          SUM(total_volume) as volume,
          (COUNT(*)::float / (SELECT COUNT(*) FROM trader_segments) * 100) as percentage
        FROM trader_segments
        GROUP BY trader_type
        ORDER BY 
          CASE trader_type
            WHEN 'High Frequency' THEN 1
            WHEN 'Active' THEN 2
            WHEN 'Regular' THEN 3
            WHEN 'Casual' THEN 4
          END
      `;

      const result = await this.db.query(query);

      return result.rows.map(row => ({
        traderType: row.trader_type,
        count: parseInt(row.count) || 0,
        volume: parseFloat(row.volume) || 0,
        percentage: parseFloat(row.percentage) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching trader distribution', error);
      throw error;
    }
  }

  /**
   * Get maker/taker ratio analysis
   */
  async getMakerTakerAnalysis(days: number = 7): Promise<any> {
    try {
      const query = `
        SELECT 
          SUM(maker_volume) as total_maker_volume,
          SUM(taker_volume) as total_taker_volume,
          AVG(maker_taker_ratio) as avg_ratio,
          COUNT(DISTINCT trading_pair) as pairs_count
        FROM metrics_daily_trading
        WHERE time >= NOW() - INTERVAL '${days} days'
      `;

      const result = await this.db.query(query);
      const row = result.rows[0];

      const makerVolume = parseFloat(row.total_maker_volume) || 0;
      const takerVolume = parseFloat(row.total_taker_volume) || 0;
      const totalVolume = makerVolume + takerVolume;

      return {
        makerVolume,
        takerVolume,
        totalVolume,
        makerPercentage: totalVolume > 0 ? (makerVolume / totalVolume) * 100 : 0,
        takerPercentage: totalVolume > 0 ? (takerVolume / totalVolume) * 100 : 0,
        ratio: parseFloat(row.avg_ratio) || 0,
        pairsCount: parseInt(row.pairs_count) || 0,
      };
    } catch (error) {
      this.logger.error('Error fetching maker/taker analysis', error);
      throw error;
    }
  }

  /**
   * Get trading frequency analysis
   */
  async getTradingFrequency(): Promise<TradingFrequency[]> {
    try {
      const query = `
        WITH user_trading_stats AS (
          SELECT 
            user_id,
            COUNT(*) as trade_count,
            SUM(volume) as total_volume
          FROM trades
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY user_id
        ),
        frequency_segments AS (
          SELECT 
            CASE
              WHEN trade_count >= 100 THEN 'Daily (100+ trades/month)'
              WHEN trade_count >= 30 THEN 'Weekly (30-99 trades/month)'
              WHEN trade_count >= 4 THEN 'Weekly (4-29 trades/month)'
              ELSE 'Occasional (< 4 trades/month)'
            END as frequency,
            user_id,
            trade_count,
            total_volume
          FROM user_trading_stats
        )
        SELECT 
          frequency,
          COUNT(*) as user_count,
          AVG(total_volume) as avg_volume,
          SUM(trade_count) as total_trades
        FROM frequency_segments
        GROUP BY frequency
        ORDER BY 
          CASE frequency
            WHEN 'Daily (100+ trades/month)' THEN 1
            WHEN 'Weekly (30-99 trades/month)' THEN 2
            WHEN 'Weekly (4-29 trades/month)' THEN 3
            ELSE 4
          END
      `;

      const result = await this.db.query(query);

      return result.rows.map(row => ({
        frequency: row.frequency,
        userCount: parseInt(row.user_count) || 0,
        avgVolume: parseFloat(row.avg_volume) || 0,
        totalTrades: parseInt(row.total_trades) || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching trading frequency', error);
      throw error;
    }
  }

  /**
   * Calculate and store trading metrics (for ETL process)
   */
  async calculateAndStoreTradingMetrics(date: Date): Promise<void> {
    try {
      this.logger.info(`Calculating trading metrics for ${date.toISOString()}`);

      // Get all trading pairs
      const pairsResult = await this.db.query(
        'SELECT DISTINCT trading_pair FROM trades WHERE created_at <= $1',
        [date]
      );
      const pairs = pairsResult.rows.map(r => r.trading_pair);

      // Calculate metrics for each pair
      for (const pair of pairs) {
        await this.calculatePairMetrics(date, pair);
      }

      // Calculate overall metrics (null pair)
      await this.calculatePairMetrics(date, null);

      this.logger.info(`Trading metrics calculated and stored for ${date.toISOString()}`);
    } catch (error) {
      this.logger.error('Error calculating trading metrics', error);
      throw error;
    }
  }

  /**
   * Calculate metrics for a specific trading pair
   */
  private async calculatePairMetrics(date: Date, pair: string | null): Promise<void> {
    const pairCondition = pair ? 'AND trading_pair = $2' : '';
    const params = pair ? [date, pair] : [date];

    // Calculate 24h volume
    const volume24hResult = await this.db.query(
      `SELECT COALESCE(SUM(volume), 0) as volume 
       FROM trades 
       WHERE created_at >= $1 - INTERVAL '1 day' 
       AND created_at <= $1 ${pairCondition}`,
      params
    );
    const volume24h = parseFloat(volume24hResult.rows[0].volume) || 0;

    // Calculate 7d volume
    const volume7dResult = await this.db.query(
      `SELECT COALESCE(SUM(volume), 0) as volume 
       FROM trades 
       WHERE created_at >= $1 - INTERVAL '7 days' 
       AND created_at <= $1 ${pairCondition}`,
      params
    );
    const volume7d = parseFloat(volume7dResult.rows[0].volume) || 0;

    // Calculate 30d volume
    const volume30dResult = await this.db.query(
      `SELECT COALESCE(SUM(volume), 0) as volume 
       FROM trades 
       WHERE created_at >= $1 - INTERVAL '30 days' 
       AND created_at <= $1 ${pairCondition}`,
      params
    );
    const volume30d = parseFloat(volume30dResult.rows[0].volume) || 0;

    // Calculate trade statistics
    const statsResult = await this.db.query(
      `SELECT 
        COUNT(*) as trade_count,
        AVG(volume) as avg_trade_size,
        COUNT(DISTINCT user_id) as active_traders,
        SUM(CASE WHEN is_maker THEN volume ELSE 0 END) as maker_volume,
        SUM(CASE WHEN NOT is_maker THEN volume ELSE 0 END) as taker_volume
       FROM trades 
       WHERE DATE(created_at) = DATE($1) ${pairCondition}`,
      params
    );
    const stats = statsResult.rows[0];

    const tradeCount = parseInt(stats.trade_count) || 0;
    const avgTradeSize = parseFloat(stats.avg_trade_size) || 0;
    const activeTraders = parseInt(stats.active_traders) || 0;
    const makerVolume = parseFloat(stats.maker_volume) || 0;
    const takerVolume = parseFloat(stats.taker_volume) || 0;
    const makerTakerRatio = takerVolume > 0 ? makerVolume / takerVolume : 0;

    // Calculate new traders
    const newTradersResult = await this.db.query(
      `SELECT COUNT(DISTINCT user_id) as new_traders
       FROM trades t1
       WHERE DATE(created_at) = DATE($1) ${pairCondition}
       AND NOT EXISTS (
         SELECT 1 FROM trades t2 
         WHERE t2.user_id = t1.user_id 
         AND t2.created_at < DATE($1)
       )`,
      params
    );
    const newTraders = parseInt(newTradersResult.rows[0].new_traders) || 0;

    const avgTradesPerUser = activeTraders > 0 ? tradeCount / activeTraders : 0;
    const volumePerUser = activeTraders > 0 ? volume24h / activeTraders : 0;

    // Insert metrics
    const insertQuery = `
      INSERT INTO metrics_daily_trading (
        time, trading_pair, total_volume_24h, total_volume_7d, total_volume_30d,
        number_of_trades, average_trade_size, maker_volume, taker_volume,
        maker_taker_ratio, active_traders, new_traders, avg_trades_per_user,
        volume_per_user
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (time, trading_pair) DO UPDATE SET
        total_volume_24h = EXCLUDED.total_volume_24h,
        total_volume_7d = EXCLUDED.total_volume_7d,
        total_volume_30d = EXCLUDED.total_volume_30d,
        number_of_trades = EXCLUDED.number_of_trades,
        average_trade_size = EXCLUDED.average_trade_size,
        maker_volume = EXCLUDED.maker_volume,
        taker_volume = EXCLUDED.taker_volume,
        maker_taker_ratio = EXCLUDED.maker_taker_ratio,
        active_traders = EXCLUDED.active_traders,
        new_traders = EXCLUDED.new_traders,
        avg_trades_per_user = EXCLUDED.avg_trades_per_user,
        volume_per_user = EXCLUDED.volume_per_user
    `;

    await this.db.query(insertQuery, [
      date,
      pair,
      volume24h,
      volume7d,
      volume30d,
      tradeCount,
      avgTradeSize,
      makerVolume,
      takerVolume,
      makerTakerRatio,
      activeTraders,
      newTraders,
      avgTradesPerUser,
      volumePerUser,
    ]);
  }
}
