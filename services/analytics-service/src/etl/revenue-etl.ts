import { tradingDb, analyticsDb } from '../config/database';
import { RevenueMetric, FinancialSnapshot, RiskExposure } from '../models/types';
import { logger } from '../utils/logger';
import { startOfDay } from 'date-fns';

export class RevenueETL {
  async extractRevenueMetrics(startDate: Date, endDate: Date): Promise<void> {
    try {
      logger.info('Starting revenue metrics ETL', { startDate, endDate });

      // Extract trading fees
      const tradingFees = await tradingDb
        .select(
          tradingDb.raw("DATE_TRUNC('hour', created_at) as hour"),
          tradingDb.raw("'trading_fee' as revenue_type"),
          'fee_currency as currency',
          tradingDb.raw('SUM(fee) as amount'),
          tradingDb.raw('COUNT(*) as transaction_count')
        )
        .from('trades')
        .whereBetween('created_at', [startDate, endDate])
        .whereNotNull('fee')
        .groupBy(tradingDb.raw("DATE_TRUNC('hour', created_at), fee_currency"));

      for (const fee of tradingFees) {
        const metric: Partial<RevenueMetric> = {
          time: fee.hour,
          revenue_type: 'trading_fee',
          amount: parseFloat(fee.amount) || 0,
          currency: fee.currency,
          transaction_count: parseInt(fee.transaction_count) || 0,
        };

        await analyticsDb('revenue_metrics')
          .insert(metric)
          .onConflict(['time', 'revenue_type', 'currency'])
          .merge();
      }

      // Extract withdrawal fees
      const withdrawalFees = await tradingDb
        .select(
          tradingDb.raw("DATE_TRUNC('hour', created_at) as hour"),
          tradingDb.raw("'withdrawal_fee' as revenue_type"),
          'currency',
          tradingDb.raw('SUM(fee) as amount'),
          tradingDb.raw('COUNT(*) as transaction_count')
        )
        .from('withdrawals')
        .whereBetween('created_at', [startDate, endDate])
        .whereNotNull('fee')
        .where('status', 'completed')
        .groupBy(tradingDb.raw("DATE_TRUNC('hour', created_at), currency"));

      for (const fee of withdrawalFees) {
        const metric: Partial<RevenueMetric> = {
          time: fee.hour,
          revenue_type: 'withdrawal_fee',
          amount: parseFloat(fee.amount) || 0,
          currency: fee.currency,
          transaction_count: parseInt(fee.transaction_count) || 0,
        };

        await analyticsDb('revenue_metrics')
          .insert(metric)
          .onConflict(['time', 'revenue_type', 'currency'])
          .merge();
      }

      logger.info('Revenue metrics ETL completed');
    } catch (error) {
      logger.error('Revenue metrics ETL failed', error);
      throw error;
    }
  }

  async generateFinancialSnapshot(date: Date): Promise<void> {
    try {
      logger.info('Generating financial snapshot', { date });

      const startOfDayDate = startOfDay(date);
      const endOfDayDate = new Date(startOfDayDate.getTime() + 24 * 60 * 60 * 1000);

      // Calculate daily revenue
      const revenue = await analyticsDb('revenue_metrics')
        .sum('amount as total')
        .whereBetween('time', [startOfDayDate, endOfDayDate])
        .first();

      const totalRevenue = parseFloat(revenue?.total) || 0;

      // Calculate assets (user balances)
      const assets = await tradingDb('balances')
        .select('currency')
        .sum('available as total_available')
        .sum('locked as total_locked')
        .groupBy('currency');

      let totalAssets = 0;
      for (const asset of assets) {
        const available = parseFloat(asset.total_available) || 0;
        const locked = parseFloat(asset.total_locked) || 0;
        totalAssets += available + locked; // Simplified - should convert to base currency
      }

      // Calculate liabilities (pending withdrawals, etc.)
      const liabilities = await tradingDb('withdrawals')
        .sum('amount as total')
        .where('status', 'pending')
        .first();

      const totalLiabilities = parseFloat(liabilities?.total) || 0;

      // Calculate expenses (simplified - would need more data sources)
      const totalExpenses = totalRevenue * 0.3; // Placeholder: 30% of revenue

      // Calculate reserve ratio
      const reserveRatio = totalAssets > 0 ? (totalAssets - totalLiabilities) / totalAssets : 0;

      const snapshot: Partial<FinancialSnapshot> = {
        snapshot_date: startOfDayDate,
        snapshot_type: 'daily',
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_profit: totalRevenue - totalExpenses,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        reserve_ratio: reserveRatio,
        snapshot_data: {
          asset_breakdown: assets,
        },
      };

      await analyticsDb('financial_snapshots')
        .insert(snapshot)
        .onConflict(['snapshot_date', 'snapshot_type'])
        .merge();

      logger.info('Financial snapshot generated');
    } catch (error) {
      logger.error('Financial snapshot generation failed', error);
      throw error;
    }
  }

  async extractRiskExposure(): Promise<void> {
    try {
      logger.info('Starting risk exposure extraction');

      const measuredAt = new Date();

      // Calculate exposure by asset
      const exposures = await tradingDb('positions')
        .select('asset')
        .sum('amount as total_exposure')
        .sum(tradingDb.raw("CASE WHEN side = 'long' THEN amount ELSE 0 END as long_exposure"))
        .sum(tradingDb.raw("CASE WHEN side = 'short' THEN amount ELSE 0 END as short_exposure"))
        .where('status', 'open')
        .groupBy('asset');

      for (const exposure of exposures) {
        const totalExposure = parseFloat(exposure.total_exposure) || 0;
        const longExposure = parseFloat(exposure.long_exposure) || 0;
        const shortExposure = parseFloat(exposure.short_exposure) || 0;

        // Calculate concentration ratio
        const allExposures = exposures.map((e) => parseFloat(e.total_exposure) || 0);
        const totalAllExposures = allExposures.reduce((sum, val) => sum + val, 0);
        const concentrationRatio = totalAllExposures > 0 ? totalExposure / totalAllExposures : 0;

        // Simplified VaR calculation (would use historical data for accurate calculation)
        const var95 = totalExposure * 0.05; // 5% of exposure
        const var99 = totalExposure * 0.01; // 1% of exposure

        const riskExposure: Partial<RiskExposure> = {
          measured_at: measuredAt,
          asset: exposure.asset,
          total_exposure: totalExposure,
          long_exposure: longExposure,
          short_exposure: shortExposure,
          concentration_ratio: concentrationRatio,
          var_95: var95,
          var_99: var99,
        };

        await analyticsDb('risk_exposure').insert(riskExposure);
      }

      logger.info(`Risk exposure extracted for ${exposures.length} assets`);
    } catch (error) {
      logger.error('Risk exposure extraction failed', error);
      throw error;
    }
  }

  async extractLiquidationEvents(startDate: Date, endDate: Date): Promise<void> {
    try {
      logger.info('Starting liquidation events extraction', { startDate, endDate });

      const events = await tradingDb
        .select('*')
        .from('liquidations')
        .whereBetween('created_at', [startDate, endDate]);

      for (const event of events) {
        await analyticsDb('liquidation_events').insert({
          occurred_at: event.created_at,
          user_id: event.user_id,
          position_id: event.position_id,
          asset: event.asset,
          amount: event.amount,
          liquidation_price: event.liquidation_price,
          loss_amount: event.loss_amount,
          event_data: event.metadata || {},
        });
      }

      logger.info(`Liquidation events extracted: ${events.length} events`);
    } catch (error) {
      logger.error('Liquidation events extraction failed', error);
      throw error;
    }
  }

  async runFullETL(): Promise<void> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    await Promise.all([
      this.extractRevenueMetrics(startDate, endDate),
      this.generateFinancialSnapshot(endDate),
      this.extractRiskExposure(),
      this.extractLiquidationEvents(startDate, endDate),
    ]);

    logger.info('Full revenue ETL completed');
  }
}
