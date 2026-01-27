import { analyticsDb } from '../config/database';
import { RiskExposure, LiquidationEvent, FraudAlert } from '../models/types';
import { logger } from '../utils/logger';
import { CacheService } from './cache-service';

export class RiskService {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  async getRiskReport(startDate: Date, endDate: Date): Promise<any> {
    const cacheKey = `risk:report:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Get latest risk exposure
      const exposures = await this.getExposureByAsset();

      // Get liquidation events
      const liquidations = await this.getLiquidationEvents(startDate, endDate);

      // Get fraud alerts
      const fraudAlerts = await this.getFraudAlerts(startDate, endDate);

      // Calculate risk metrics
      const totalExposure = exposures.reduce((sum, e) => sum + e.total_exposure, 0);
      const highRiskAssets = exposures.filter((e) => e.concentration_ratio > 0.3);

      const report = {
        period: { start: startDate, end: endDate },
        exposure: {
          total: totalExposure,
          by_asset: exposures,
          high_concentration: highRiskAssets,
        },
        liquidations: {
          total_events: liquidations.length,
          total_loss: liquidations.reduce((sum, l) => sum + l.loss_amount, 0),
          by_asset: this.groupLiquidationsByAsset(liquidations),
        },
        fraud: {
          total_alerts: fraudAlerts.length,
          by_severity: this.groupAlertsBySeverity(fraudAlerts),
          open_alerts: fraudAlerts.filter((a) => a.status === 'open').length,
        },
        risk_score: this.calculateOverallRiskScore(exposures, liquidations, fraudAlerts),
      };

      await this.cacheService.set(cacheKey, report, 300); // Cache for 5 minutes
      return report;
    } catch (error) {
      logger.error('Error getting risk report', error);
      throw error;
    }
  }

  async getExposureByAsset(): Promise<RiskExposure[]> {
    try {
      // Get latest exposure for each asset
      const exposures = await analyticsDb('risk_exposure')
        .select('asset')
        .max('measured_at as latest_time')
        .groupBy('asset');

      const result: RiskExposure[] = [];

      for (const exp of exposures) {
        const detail = await analyticsDb('risk_exposure')
          .where('asset', exp.asset)
          .where('measured_at', exp.latest_time)
          .first();

        if (detail) {
          result.push({
            exposure_id: detail.exposure_id,
            measured_at: detail.measured_at,
            asset: detail.asset,
            total_exposure: parseFloat(detail.total_exposure),
            long_exposure: parseFloat(detail.long_exposure),
            short_exposure: parseFloat(detail.short_exposure),
            concentration_ratio: parseFloat(detail.concentration_ratio),
            var_95: parseFloat(detail.var_95),
            var_99: parseFloat(detail.var_99),
          });
        }
      }

      return result;
    } catch (error) {
      logger.error('Error getting exposure by asset', error);
      throw error;
    }
  }

  async getLiquidationEvents(startDate: Date, endDate: Date): Promise<LiquidationEvent[]> {
    try {
      const events = await analyticsDb('liquidation_events')
        .whereBetween('occurred_at', [startDate, endDate])
        .orderBy('occurred_at', 'desc');

      return events.map((e) => ({
        event_id: e.event_id,
        occurred_at: e.occurred_at,
        user_id: e.user_id,
        position_id: e.position_id,
        asset: e.asset,
        amount: parseFloat(e.amount),
        liquidation_price: parseFloat(e.liquidation_price),
        loss_amount: parseFloat(e.loss_amount),
        event_data: e.event_data || {},
      }));
    } catch (error) {
      logger.error('Error getting liquidation events', error);
      throw error;
    }
  }

  async getFraudAlerts(startDate: Date, endDate: Date, status?: string): Promise<FraudAlert[]> {
    try {
      let query = analyticsDb('fraud_alerts')
        .whereBetween('detected_at', [startDate, endDate])
        .orderBy('detected_at', 'desc');

      if (status) {
        query = query.where('status', status);
      }

      const alerts = await query;

      return alerts.map((a) => ({
        alert_id: a.alert_id,
        detected_at: a.detected_at,
        user_id: a.user_id,
        alert_type: a.alert_type,
        severity: a.severity,
        description: a.description,
        alert_data: a.alert_data || {},
        status: a.status,
        assigned_to: a.assigned_to,
        resolved_at: a.resolved_at,
      }));
    } catch (error) {
      logger.error('Error getting fraud alerts', error);
      throw error;
    }
  }

  async getConcentrationRisk(): Promise<any> {
    try {
      const exposures = await this.getExposureByAsset();
      const totalExposure = exposures.reduce((sum, e) => sum + e.total_exposure, 0);

      const concentrations = exposures.map((e) => ({
        asset: e.asset,
        exposure: e.total_exposure,
        percentage: totalExposure > 0 ? (e.total_exposure / totalExposure) * 100 : 0,
        risk_level: this.assessConcentrationRisk(e.concentration_ratio),
      }));

      return {
        total_exposure: totalExposure,
        concentrations: concentrations.sort((a, b) => b.percentage - a.percentage),
        diversification_score: this.calculateDiversificationScore(concentrations),
      };
    } catch (error) {
      logger.error('Error getting concentration risk', error);
      throw error;
    }
  }

  private groupLiquidationsByAsset(liquidations: LiquidationEvent[]): Record<string, any> {
    const grouped: Record<string, any> = {};

    liquidations.forEach((liq) => {
      if (!grouped[liq.asset]) {
        grouped[liq.asset] = {
          count: 0,
          total_loss: 0,
        };
      }
      grouped[liq.asset].count++;
      grouped[liq.asset].total_loss += liq.loss_amount;
    });

    return grouped;
  }

  private groupAlertsBySeverity(alerts: FraudAlert[]): Record<string, number> {
    const grouped: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    alerts.forEach((alert) => {
      grouped[alert.severity] = (grouped[alert.severity] || 0) + 1;
    });

    return grouped;
  }

  private calculateOverallRiskScore(
    exposures: RiskExposure[],
    liquidations: LiquidationEvent[],
    fraudAlerts: FraudAlert[]
  ): number {
    let score = 0;

    // Exposure risk (0-40 points)
    const avgConcentration =
      exposures.reduce((sum, e) => sum + e.concentration_ratio, 0) / exposures.length || 0;
    if (avgConcentration < 0.2) score += 40;
    else if (avgConcentration < 0.3) score += 30;
    else if (avgConcentration < 0.4) score += 20;
    else score += 10;

    // Liquidation risk (0-30 points)
    const totalLoss = liquidations.reduce((sum, l) => sum + l.loss_amount, 0);
    if (totalLoss === 0) score += 30;
    else if (totalLoss < 10000) score += 20;
    else if (totalLoss < 50000) score += 10;

    // Fraud risk (0-30 points)
    const criticalAlerts = fraudAlerts.filter((a) => a.severity === 'critical').length;
    if (criticalAlerts === 0) score += 30;
    else if (criticalAlerts < 5) score += 20;
    else if (criticalAlerts < 10) score += 10;

    return score;
  }

  private assessConcentrationRisk(ratio: number): string {
    if (ratio < 0.2) return 'low';
    if (ratio < 0.3) return 'medium';
    if (ratio < 0.4) return 'high';
    return 'critical';
  }

  private calculateDiversificationScore(concentrations: any[]): number {
    // Higher score means better diversification
    const maxPercentage = Math.max(...concentrations.map((c) => c.percentage));

    if (maxPercentage < 20) return 100;
    if (maxPercentage < 30) return 80;
    if (maxPercentage < 40) return 60;
    if (maxPercentage < 50) return 40;
    return 20;
  }
}
