import { tradingDb, analyticsDb } from '../config/database';
import { TradingVolumeMetric, PriceMovement } from '../models/types';
import { logger } from '../utils/logger';

export class TradingETL {
  async extractTradingVolume(startDate: Date, endDate: Date): Promise<void> {
    try {
      logger.info('Starting trading volume ETL', { startDate, endDate });

      // Extract trading data from operational database
      const trades = await tradingDb
        .select(
          tradingDb.raw("DATE_TRUNC('hour', created_at) as hour"),
          'trading_pair',
          tradingDb.raw('SUM(CASE WHEN side = ? THEN amount ELSE 0 END) as buy_volume', ['buy']),
          tradingDb.raw('SUM(CASE WHEN side = ? THEN amount ELSE 0 END) as sell_volume', ['sell']),
          tradingDb.raw('SUM(amount) as total_volume'),
          tradingDb.raw('COUNT(*) as trade_count'),
          tradingDb.raw('COUNT(DISTINCT user_id) as unique_users'),
          tradingDb.raw('AVG(amount) as avg_trade_size')
        )
        .from('trades')
        .whereBetween('created_at', [startDate, endDate])
        .groupBy(tradingDb.raw("DATE_TRUNC('hour', created_at), trading_pair"));

      // Transform and load into analytics database
      for (const trade of trades) {
        const metric: Partial<TradingVolumeMetric> = {
          time: trade.hour,
          trading_pair: trade.trading_pair,
          buy_volume: parseFloat(trade.buy_volume) || 0,
          sell_volume: parseFloat(trade.sell_volume) || 0,
          total_volume: parseFloat(trade.total_volume) || 0,
          trade_count: parseInt(trade.trade_count) || 0,
          unique_users: parseInt(trade.unique_users) || 0,
          avg_trade_size: parseFloat(trade.avg_trade_size) || 0,
        };

        await analyticsDb('trading_volume_metrics')
          .insert(metric)
          .onConflict(['time', 'trading_pair'])
          .merge();
      }

      logger.info(`Trading volume ETL completed: ${trades.length} records processed`);
    } catch (error) {
      logger.error('Trading volume ETL failed', error);
      throw error;
    }
  }

  async extractTradingVolumeByUserLevel(startDate: Date, endDate: Date): Promise<void> {
    try {
      logger.info('Starting trading volume by user level ETL', { startDate, endDate });

      // Join trades with user levels
      const trades = await tradingDb
        .select(
          tradingDb.raw("DATE_TRUNC('hour', t.created_at) as hour"),
          't.trading_pair',
          'u.kyc_level as user_level',
          tradingDb.raw('SUM(CASE WHEN t.side = ? THEN t.amount ELSE 0 END) as buy_volume', ['buy']),
          tradingDb.raw('SUM(CASE WHEN t.side = ? THEN t.amount ELSE 0 END) as sell_volume', ['sell']),
          tradingDb.raw('SUM(t.amount) as total_volume'),
          tradingDb.raw('COUNT(*) as trade_count'),
          tradingDb.raw('COUNT(DISTINCT t.user_id) as unique_users'),
          tradingDb.raw('AVG(t.amount) as avg_trade_size')
        )
        .from('trades as t')
        .join('users as u', 't.user_id', 'u.user_id')
        .whereBetween('t.created_at', [startDate, endDate])
        .groupBy(tradingDb.raw("DATE_TRUNC('hour', t.created_at), t.trading_pair, u.kyc_level"));

      for (const trade of trades) {
        const metric: Partial<TradingVolumeMetric> = {
          time: trade.hour,
          trading_pair: trade.trading_pair,
          user_level: trade.user_level,
          buy_volume: parseFloat(trade.buy_volume) || 0,
          sell_volume: parseFloat(trade.sell_volume) || 0,
          total_volume: parseFloat(trade.total_volume) || 0,
          trade_count: parseInt(trade.trade_count) || 0,
          unique_users: parseInt(trade.unique_users) || 0,
          avg_trade_size: parseFloat(trade.avg_trade_size) || 0,
        };

        await analyticsDb('trading_volume_metrics')
          .insert(metric)
          .onConflict(['time', 'trading_pair', 'user_level'])
          .merge();
      }

      logger.info(`Trading volume by user level ETL completed: ${trades.length} records processed`);
    } catch (error) {
      logger.error('Trading volume by user level ETL failed', error);
      throw error;
    }
  }

  async extractPriceMovements(startDate: Date, endDate: Date): Promise<void> {
    try {
      logger.info('Starting price movements ETL', { startDate, endDate });

      const tradingPairs = await tradingDb('trades')
        .distinct('trading_pair')
        .pluck('trading_pair');

      for (const pair of tradingPairs) {
        const candles = await tradingDb
          .select(
            tradingDb.raw("DATE_TRUNC('hour', created_at) as hour"),
            tradingDb.raw('(array_agg(price ORDER BY created_at ASC))[1] as open_price'),
            tradingDb.raw('MAX(price) as high_price'),
            tradingDb.raw('MIN(price) as low_price'),
            tradingDb.raw('(array_agg(price ORDER BY created_at DESC))[1] as close_price'),
            tradingDb.raw('SUM(amount) as volume')
          )
          .from('trades')
          .where('trading_pair', pair)
          .whereBetween('created_at', [startDate, endDate])
          .groupBy(tradingDb.raw("DATE_TRUNC('hour', created_at)"));

        for (const candle of candles) {
          const openPrice = parseFloat(candle.open_price);
          const closePrice = parseFloat(candle.close_price);
          const highPrice = parseFloat(candle.high_price);
          const lowPrice = parseFloat(candle.low_price);

          const priceChange = ((closePrice - openPrice) / openPrice) * 100;
          const volatility = ((highPrice - lowPrice) / openPrice) * 100;

          const movement: Partial<PriceMovement> = {
            time: candle.hour,
            trading_pair: pair,
            open_price: openPrice,
            high_price: highPrice,
            low_price: lowPrice,
            close_price: closePrice,
            volume: parseFloat(candle.volume) || 0,
            volatility: volatility,
            price_change: priceChange,
          };

          await analyticsDb('price_movements')
            .insert(movement)
            .onConflict(['time', 'trading_pair'])
            .merge();
        }
      }

      logger.info(`Price movements ETL completed for ${tradingPairs.length} pairs`);
    } catch (error) {
      logger.error('Price movements ETL failed', error);
      throw error;
    }
  }

  async extractLiquidityMetrics(startDate: Date, endDate: Date): Promise<void> {
    try {
      logger.info('Starting liquidity metrics ETL', { startDate, endDate });

      const snapshots = await tradingDb
        .select(
          tradingDb.raw("DATE_TRUNC('hour', created_at) as hour"),
          'trading_pair',
          tradingDb.raw("SUM(CASE WHEN side = 'buy' THEN amount ELSE 0 END) as bid_volume"),
          tradingDb.raw("SUM(CASE WHEN side = 'sell' THEN amount ELSE 0 END) as ask_volume"),
          tradingDb.raw('COUNT(*) as order_count')
        )
        .from('order_book_snapshots')
        .whereBetween('created_at', [startDate, endDate])
        .groupBy(tradingDb.raw("DATE_TRUNC('hour', created_at), trading_pair"));

      for (const snapshot of snapshots) {
        const bidVolume = parseFloat(snapshot.bid_volume) || 0;
        const askVolume = parseFloat(snapshot.ask_volume) || 0;
        
        // Simplified spread calculation (would need order book data for accurate calculation)
        const spread = 0; // Placeholder

        await analyticsDb('liquidity_metrics').insert({
          time: snapshot.hour,
          trading_pair: snapshot.trading_pair,
          bid_volume: bidVolume,
          ask_volume: askVolume,
          spread: spread,
          depth_10: bidVolume + askVolume,
          depth_20: bidVolume + askVolume,
          order_count: parseInt(snapshot.order_count) || 0,
        });
      }

      logger.info(`Liquidity metrics ETL completed: ${snapshots.length} records processed`);
    } catch (error) {
      logger.error('Liquidity metrics ETL failed', error);
      throw error;
    }
  }

  async runFullETL(): Promise<void> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    await Promise.all([
      this.extractTradingVolume(startDate, endDate),
      this.extractTradingVolumeByUserLevel(startDate, endDate),
      this.extractPriceMovements(startDate, endDate),
      this.extractLiquidityMetrics(startDate, endDate),
    ]);

    logger.info('Full trading ETL completed');
  }
}
