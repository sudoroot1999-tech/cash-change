import { analyticsDb } from '../config/database';
import { TradingAnalytics, PriceMovement } from '../models/types';
import { logger } from '../utils/logger';
import { CacheService } from './cache-service';

export class TradingAnalyticsService {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  async getTradingAnalytics(startDate: Date, endDate: Date): Promise<TradingAnalytics> {
    const cacheKey = `trading:analytics:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.cacheService.get<TradingAnalytics>(cacheKey);
    if (cached) return cached;

    try {
      // Volume by pair
      const volumeByPair = await analyticsDb('trading_volume_metrics')
        .select('trading_pair')
        .sum('total_volume as volume')
        .sum('trade_count as trades')
        .sum('unique_users as users')
        .whereBetween('time', [startDate, endDate])
        .groupBy('trading_pair')
        .orderBy('volume', 'desc');

      // Price movements
      const priceData = await analyticsDb('price_movements')
        .select('*')
        .whereBetween('time', [startDate, endDate])
        .orderBy('time', 'asc');

      const priceMovements: Record<string, PriceMovement[]> = {};
      priceData.forEach((pm) => {
        if (!priceMovements[pm.trading_pair]) {
          priceMovements[pm.trading_pair] = [];
        }
        priceMovements[pm.trading_pair].push({
          time: pm.time,
          trading_pair: pm.trading_pair,
          open_price: parseFloat(pm.open_price),
          high_price: parseFloat(pm.high_price),
          low_price: parseFloat(pm.low_price),
          close_price: parseFloat(pm.close_price),
          volume: parseFloat(pm.volume),
          volatility: parseFloat(pm.volatility),
          price_change: parseFloat(pm.price_change),
        });
      });

      // Liquidity metrics
      const liquidityData = await analyticsDb('liquidity_metrics')
        .select('trading_pair')
        .avg('bid_volume as bid_volume')
        .avg('ask_volume as ask_volume')
        .avg('spread as spread')
        .whereBetween('time', [startDate, endDate])
        .groupBy('trading_pair');

      // Maker/Taker ratio (simplified - would need order data)
      const makerTakerRatio = {
        maker_volume: 0,
        taker_volume: 0,
        ratio: 0.6, // Placeholder
      };

      // Slippage analysis (simplified)
      const slippageAnalysis = volumeByPair.map((vp) => ({
        pair: vp.trading_pair,
        avg_slippage: 0.1, // Placeholder
        max_slippage: 0.5, // Placeholder
      }));

      const analytics: TradingAnalytics = {
        period: { start: startDate, end: endDate },
        volume_by_pair: volumeByPair.map((vp) => ({
          pair: vp.trading_pair,
          volume: parseFloat(vp.volume),
          trades: parseInt(vp.trades),
          unique_users: parseInt(vp.users),
        })),
        price_movements: priceMovements,
        liquidity: liquidityData.map((ld) => ({
          pair: ld.trading_pair,
          bid_volume: parseFloat(ld.bid_volume) || 0,
          ask_volume: parseFloat(ld.ask_volume) || 0,
          spread: parseFloat(ld.spread) || 0,
        })),
        maker_taker_ratio: makerTakerRatio,
        slippage_analysis: slippageAnalysis,
      };

      await this.cacheService.set(cacheKey, analytics, 300); // Cache for 5 minutes
      return analytics;
    } catch (error) {
      logger.error('Error getting trading analytics', error);
      throw error;
    }
  }

  async getVolumeByPair(
    startDate: Date,
    endDate: Date,
    pair?: string
  ): Promise<Array<{ time: Date; volume: number; trades: number }>> {
    try {
      let query = analyticsDb('trading_volume_metrics')
        .select(
          'time',
          analyticsDb.raw('SUM(total_volume) as volume'),
          analyticsDb.raw('SUM(trade_count) as trades')
        )
        .whereBetween('time', [startDate, endDate])
        .groupBy('time')
        .orderBy('time', 'asc');

      if (pair) {
        query = query.where('trading_pair', pair);
      }

      const data = await query;

      return data.map((d) => ({
        time: d.time,
        volume: parseFloat(d.volume),
        trades: parseInt(d.trades),
      }));
    } catch (error) {
      logger.error('Error getting volume by pair', error);
      throw error;
    }
  }

  async getPriceHistory(pair: string, startDate: Date, endDate: Date): Promise<PriceMovement[]> {
    try {
      const data = await analyticsDb('price_movements')
        .where('trading_pair', pair)
        .whereBetween('time', [startDate, endDate])
        .orderBy('time', 'asc');

      return data.map((d) => ({
        time: d.time,
        trading_pair: d.trading_pair,
        open_price: parseFloat(d.open_price),
        high_price: parseFloat(d.high_price),
        low_price: parseFloat(d.low_price),
        close_price: parseFloat(d.close_price),
        volume: parseFloat(d.volume),
        volatility: parseFloat(d.volatility),
        price_change: parseFloat(d.price_change),
      }));
    } catch (error) {
      logger.error('Error getting price history', error);
      throw error;
    }
  }

  async getLiquidityMetrics(
    pair: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ time: Date; bid_volume: number; ask_volume: number; spread: number }>> {
    try {
      const data = await analyticsDb('liquidity_metrics')
        .select('time', 'bid_volume', 'ask_volume', 'spread')
        .where('trading_pair', pair)
        .whereBetween('time', [startDate, endDate])
        .orderBy('time', 'asc');

      return data.map((d) => ({
        time: d.time,
        bid_volume: parseFloat(d.bid_volume),
        ask_volume: parseFloat(d.ask_volume),
        spread: parseFloat(d.spread),
      }));
    } catch (error) {
      logger.error('Error getting liquidity metrics', error);
      throw error;
    }
  }
}
