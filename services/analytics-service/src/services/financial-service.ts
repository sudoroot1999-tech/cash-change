import { analyticsDb } from '../config/database';
import { FinancialSnapshot, RevenueMetric } from '../models/types';
import { logger } from '../utils/logger';
import { CacheService } from './cache-service';
import { startOfDay, endOfDay } from 'date-fns';

export class FinancialService {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  async getFinancialReport(startDate: Date, endDate: Date): Promise<any> {
    const cacheKey = `financial:report:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get financial snapshots
      const snapshots = await analyticsDb('financial_snapshots')
        .whereBetween('snapshot_date', [startDate, endDate])
        .orderBy('snapshot_date', 'asc');

      // Revenue breakdown
      const revenueBreakdown = await analyticsDb('revenue_metrics')
        .select('revenue_type', 'currency')
        .sum('amount as total')
        .whereBetween('time', [startDate, endDate])
        .groupBy('revenue_type', 'currency');

      // Calculate totals
      const totalRevenue = snapshots.reduce((sum, s) => sum + parseFloat(s.total_revenue), 0);
      const totalExpenses = snapshots.reduce((sum, s) => sum + parseFloat(s.total_expenses), 0);
      const netProfit = totalRevenue - totalExpenses;

      // Latest balance sheet data
      const latestSnapshot = snapshots[snapshots.length - 1];

      const report = {
        period: { start: startDate, end: endDate },
        profit_and_loss: {
          total_revenue: totalRevenue,
          revenue_breakdown: revenueBreakdown.map((rb) => ({
            type: rb.revenue_type,
            currency: rb.currency,
            amount: parseFloat(rb.total),
          })),
          total_expenses: totalExpenses,
          net_profit: netProfit,
          profit_margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
        },
        balance_sheet: latestSnapshot
          ? {
              total_assets: parseFloat(latestSnapshot.total_assets),
              total_liabilities: parseFloat(latestSnapshot.total_liabilities),
              equity: parseFloat(latestSnapshot.total_assets) - parseFloat(latestSnapshot.total_liabilities),
              reserve_ratio: parseFloat(latestSnapshot.reserve_ratio),
            }
          : null,
        snapshots: snapshots.map((s) => ({
          date: s.snapshot_date,
          revenue: parseFloat(s.total_revenue),
          expenses: parseFloat(s.total_expenses),
          profit: parseFloat(s.net_profit),
          assets: parseFloat(s.total_assets),
          liabilities: parseFloat(s.total_liabilities),
        })),
      };

      await this.cacheService.set(cacheKey, report, 600); // Cache for 10 minutes
      return report;
    } catch (error) {
      logger.error('Error getting financial report', error);
      throw error;
    }
  }

  async getRevenueMetrics(startDate: Date, endDate: Date, currency?: string): Promise<RevenueMetric[]> {
    try {
      let query = analyticsDb('revenue_metrics')
        .whereBetween('time', [startDate, endDate])
        .orderBy('time', 'asc');

      if (currency) {
        query = query.where('currency', currency);
      }

      const metrics = await query;

      return metrics.map((m) => ({
        time: m.time,
        revenue_type: m.revenue_type,
        amount: parseFloat(m.amount),
        currency: m.currency,
        transaction_count: m.transaction_count,
      }));
    } catch (error) {
      logger.error('Error getting revenue metrics', error);
      throw error;
    }
  }

  async getFeeRevenue(startDate: Date, endDate: Date): Promise<any> {
    try {
      const feeRevenue = await analyticsDb('revenue_metrics')
        .select('revenue_type', 'currency')
        .sum('amount as total')
        .sum('transaction_count as transactions')
        .whereBetween('time', [startDate, endDate])
        .groupBy('revenue_type', 'currency');

      const breakdown: Record<string, any> = {};

      feeRevenue.forEach((fr) => {
        if (!breakdown[fr.revenue_type]) {
          breakdown[fr.revenue_type] = {
            total: 0,
            by_currency: {},
            transactions: 0,
          };
        }

        breakdown[fr.revenue_type].total += parseFloat(fr.total);
        breakdown[fr.revenue_type].by_currency[fr.currency] = parseFloat(fr.total);
        breakdown[fr.revenue_type].transactions += parseInt(fr.transactions);
      });

      return {
        period: { start: startDate, end: endDate },
        breakdown,
        total: Object.values(breakdown).reduce((sum: number, b: any) => sum + b.total, 0),
      };
    } catch (error) {
      logger.error('Error getting fee revenue', error);
      throw error;
    }
  }

  async getAssetLiabilityManagement(): Promise<any> {
    try {
      const latestSnapshot = await analyticsDb('financial_snapshots')
        .orderBy('snapshot_date', 'desc')
        .first();

      if (!latestSnapshot) {
        return null;
      }

      return {
        snapshot_date: latestSnapshot.snapshot_date,
        total_assets: parseFloat(latestSnapshot.total_assets),
        total_liabilities: parseFloat(latestSnapshot.total_liabilities),
        net_assets: parseFloat(latestSnapshot.total_assets) - parseFloat(latestSnapshot.total_liabilities),
        reserve_ratio: parseFloat(latestSnapshot.reserve_ratio),
        asset_breakdown: latestSnapshot.snapshot_data?.asset_breakdown || [],
        health_score: this.calculateHealthScore(latestSnapshot),
      };
    } catch (error) {
      logger.error('Error getting asset/liability management', error);
      throw error;
    }
  }

  private calculateHealthScore(snapshot: any): number {
    const reserveRatio = parseFloat(snapshot.reserve_ratio);
    const assets = parseFloat(snapshot.total_assets);
    const liabilities = parseFloat(snapshot.total_liabilities);

    let score = 0;

    // Reserve ratio score (0-40 points)
    if (reserveRatio >= 1.0) score += 40;
    else if (reserveRatio >= 0.8) score += 30;
    else if (reserveRatio >= 0.6) score += 20;
    else score += 10;

    // Asset/Liability ratio score (0-30 points)
    const alRatio = liabilities > 0 ? assets / liabilities : 2;
    if (alRatio >= 2.0) score += 30;
    else if (alRatio >= 1.5) score += 20;
    else if (alRatio >= 1.0) score += 10;

    // Profitability score (0-30 points)
    const profit = parseFloat(snapshot.net_profit);
    if (profit > 0) score += 30;
    else if (profit > -1000) score += 15;

    return score;
  }
}
