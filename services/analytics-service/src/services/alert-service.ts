import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';

interface MetricAlert {
  alertId: number;
  metricName: string;
  metricCategory: string;
  thresholdType: 'above' | 'below' | 'percentage_change';
  thresholdValue: number;
  comparisonPeriod?: string;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  alertChannels: string[];
}

interface AlertTrigger {
  alertId: number;
  metricName: string;
  currentValue: number;
  thresholdValue: number;
  severity: string;
  message: string;
}

interface AnomalyDetection {
  metricName: string;
  currentValue: number;
  expectedRange: { min: number; max: number };
  isAnomaly: boolean;
  deviationPercentage: number;
}

export class AlertService {
  private db: Pool;
  private cache: RedisClientType;
  private logger: typeof logger;

  constructor(db: Pool, cache: RedisClientType) {
    this.db = db;
    this.cache = cache;
    this.logger = logger;
  }

  /**
   * Check all enabled alerts and trigger notifications
   */
  async checkAlerts(): Promise<AlertTrigger[]> {
    try {
      this.logger.info('Checking metric alerts...');

      const alerts = await this.getEnabledAlerts();
      const triggeredAlerts: AlertTrigger[] = [];

      for (const alert of alerts) {
        const shouldTrigger = await this.evaluateAlert(alert);
        if (shouldTrigger) {
          const trigger = await this.triggerAlert(alert);
          triggeredAlerts.push(trigger);
        }
      }

      this.logger.info(`Checked ${alerts.length} alerts, triggered ${triggeredAlerts.length}`);
      return triggeredAlerts;
    } catch (error) {
      this.logger.error('Error checking alerts', error);
      throw error;
    }
  }

  /**
   * Get all enabled alerts
   */
  private async getEnabledAlerts(): Promise<MetricAlert[]> {
    const query = `
      SELECT 
        alert_id,
        metric_name,
        metric_category,
        threshold_type,
        threshold_value,
        comparison_period,
        severity,
        enabled,
        alert_channels
      FROM metric_alerts
      WHERE enabled = true
    `;

    const result = await this.db.query(query);

    return result.rows.map(row => ({
      alertId: row.alert_id,
      metricName: row.metric_name,
      metricCategory: row.metric_category,
      thresholdType: row.threshold_type,
      thresholdValue: parseFloat(row.threshold_value),
      comparisonPeriod: row.comparison_period,
      severity: row.severity,
      enabled: row.enabled,
      alertChannels: row.alert_channels,
    }));
  }

  /**
   * Evaluate if an alert should be triggered
   */
  private async evaluateAlert(alert: MetricAlert): Promise<boolean> {
    try {
      const currentValue = await this.getCurrentMetricValue(alert);
      
      if (currentValue === null) {
        return false;
      }

      switch (alert.thresholdType) {
        case 'above':
          return currentValue > alert.thresholdValue;
        
        case 'below':
          return currentValue < alert.thresholdValue;
        
        case 'percentage_change':
          const previousValue = await this.getPreviousMetricValue(alert);
          if (previousValue === null || previousValue === 0) {
            return false;
          }
          const percentChange = ((currentValue - previousValue) / previousValue) * 100;
          return Math.abs(percentChange) > Math.abs(alert.thresholdValue);
        
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Error evaluating alert ${alert.alertId}`, error);
      return false;
    }
  }

  /**
   * Get current metric value
   */
  private async getCurrentMetricValue(alert: MetricAlert): Promise<number | null> {
    const table = this.getMetricTable(alert.metricCategory);
    const column = this.convertMetricNameToColumn(alert.metricName);

    try {
      const query = `
        SELECT ${column} as value
        FROM ${table}
        ORDER BY time DESC
        LIMIT 1
      `;

      const result = await this.db.query(query);
      return result.rows[0] ? parseFloat(result.rows[0].value) : null;
    } catch (error) {
      this.logger.error(`Error getting current value for ${alert.metricName}`, error);
      return null;
    }
  }

  /**
   * Get previous metric value for comparison
   */
  private async getPreviousMetricValue(alert: MetricAlert): Promise<number | null> {
    const table = this.getMetricTable(alert.metricCategory);
    const column = this.convertMetricNameToColumn(alert.metricName);
    const interval = alert.comparisonPeriod || '1 day';

    try {
      const query = `
        SELECT AVG(${column}) as value
        FROM ${table}
        WHERE time >= NOW() - INTERVAL '${interval}' * 2
        AND time < NOW() - INTERVAL '${interval}'
      `;

      const result = await this.db.query(query);
      return result.rows[0] ? parseFloat(result.rows[0].value) : null;
    } catch (error) {
      this.logger.error(`Error getting previous value for ${alert.metricName}`, error);
      return null;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(alert: MetricAlert): Promise<AlertTrigger> {
    const currentValue = await this.getCurrentMetricValue(alert);
    
    const message = this.generateAlertMessage(alert, currentValue!);

    // Check if this alert was recently triggered (deduplicate)
    const recentlyTriggered = await this.wasRecentlyTriggered(alert.alertId);
    if (!recentlyTriggered) {
      // Insert into alert history
      await this.db.query(
        `INSERT INTO alert_history (
          alert_id, triggered_at, metric_name, current_value,
          threshold_value, severity, message
        ) VALUES ($1, NOW(), $2, $3, $4, $5, $6)`,
        [
          alert.alertId,
          alert.metricName,
          currentValue,
          alert.thresholdValue,
          alert.severity,
          message,
        ]
      );

      // Send notifications
      await this.sendAlertNotifications(alert, message);
    }

    return {
      alertId: alert.alertId,
      metricName: alert.metricName,
      currentValue: currentValue!,
      thresholdValue: alert.thresholdValue,
      severity: alert.severity,
      message,
    };
  }

  /**
   * Check if alert was recently triggered (within last hour)
   */
  private async wasRecentlyTriggered(alertId: number): Promise<boolean> {
    const result = await this.db.query(
      `SELECT COUNT(*) as count
       FROM alert_history
       WHERE alert_id = $1
       AND triggered_at >= NOW() - INTERVAL '1 hour'
       AND acknowledged = false`,
      [alertId]
    );

    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(alert: MetricAlert, currentValue: number): string {
    const formatted = currentValue.toFixed(2);
    const threshold = alert.thresholdValue.toFixed(2);

    switch (alert.thresholdType) {
      case 'above':
        return `${alert.metricName} is above threshold: ${formatted} > ${threshold}`;
      case 'below':
        return `${alert.metricName} is below threshold: ${formatted} < ${threshold}`;
      case 'percentage_change':
        return `${alert.metricName} changed significantly: current value ${formatted}`;
      default:
        return `Alert triggered for ${alert.metricName}`;
    }
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: MetricAlert, message: string): Promise<void> {
    for (const channel of alert.alertChannels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailNotification(alert, message);
            break;
          case 'slack':
            await this.sendSlackNotification(alert, message);
            break;
          case 'sms':
            await this.sendSMSNotification(alert, message);
            break;
        }
      } catch (error) {
        this.logger.error(`Error sending ${channel} notification`, error);
      }
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: MetricAlert, message: string): Promise<void> {
    // Implementation would integrate with email service
    this.logger.info(`[EMAIL] ${alert.severity.toUpperCase()}: ${message}`);
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: MetricAlert, message: string): Promise<void> {
    // Implementation would integrate with Slack API
    this.logger.info(`[SLACK] ${alert.severity.toUpperCase()}: ${message}`);
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(alert: MetricAlert, message: string): Promise<void> {
    // Implementation would integrate with SMS service
    this.logger.info(`[SMS] ${alert.severity.toUpperCase()}: ${message}`);
  }

  /**
   * Detect anomalies using statistical methods
   */
  async detectAnomalies(metricCategory: string): Promise<AnomalyDetection[]> {
    try {
      const table = this.getMetricTable(metricCategory);
      const columns = await this.getNumericColumns(table);
      const anomalies: AnomalyDetection[] = [];

      for (const column of columns) {
        const anomaly = await this.detectColumnAnomaly(table, column);
        if (anomaly.isAnomaly) {
          anomalies.push(anomaly);
        }
      }

      return anomalies;
    } catch (error) {
      this.logger.error('Error detecting anomalies', error);
      throw error;
    }
  }

  /**
   * Detect anomaly for a specific column
   */
  private async detectColumnAnomaly(table: string, column: string): Promise<AnomalyDetection> {
    const query = `
      WITH stats AS (
        SELECT 
          AVG(${column}) as mean,
          STDDEV(${column}) as stddev
        FROM ${table}
        WHERE time >= NOW() - INTERVAL '7 days'
        AND time < NOW() - INTERVAL '1 hour'
      ),
      current AS (
        SELECT ${column} as value
        FROM ${table}
        ORDER BY time DESC
        LIMIT 1
      )
      SELECT 
        current.value,
        stats.mean,
        stats.stddev
      FROM current, stats
    `;

    const result = await this.db.query(query);
    const row = result.rows[0];

    if (!row) {
      return {
        metricName: column,
        currentValue: 0,
        expectedRange: { min: 0, max: 0 },
        isAnomaly: false,
        deviationPercentage: 0,
      };
    }

    const currentValue = parseFloat(row.value) || 0;
    const mean = parseFloat(row.mean) || 0;
    const stddev = parseFloat(row.stddev) || 0;

    // Use 3-sigma rule for anomaly detection
    const minExpected = mean - (3 * stddev);
    const maxExpected = mean + (3 * stddev);
    const isAnomaly = currentValue < minExpected || currentValue > maxExpected;
    
    const deviation = mean !== 0 ? Math.abs((currentValue - mean) / mean) * 100 : 0;

    return {
      metricName: column,
      currentValue,
      expectedRange: { min: minExpected, max: maxExpected },
      isAnomaly,
      deviationPercentage: deviation,
    };
  }

  /**
   * Get alert history
   */
  async getAlertHistory(days: number = 7, severity?: string): Promise<any[]> {
    try {
      const severityCondition = severity ? 'AND severity = $2' : '';
      const params = severity ? [days, severity] : [days];

      const query = `
        SELECT 
          ah.*,
          ma.metric_category,
          ma.threshold_type
        FROM alert_history ah
        INNER JOIN metric_alerts ma ON ah.alert_id = ma.alert_id
        WHERE ah.triggered_at >= NOW() - INTERVAL '${days} days'
        ${severityCondition}
        ORDER BY ah.triggered_at DESC
        LIMIT 100
      `;

      const result = await this.db.query(query, params);

      return result.rows.map(row => ({
        historyId: row.history_id,
        alertId: row.alert_id,
        triggeredAt: row.triggered_at,
        metricName: row.metric_name,
        metricCategory: row.metric_category,
        currentValue: parseFloat(row.current_value),
        thresholdValue: parseFloat(row.threshold_value),
        severity: row.severity,
        message: row.message,
        acknowledged: row.acknowledged,
        acknowledgedBy: row.acknowledged_by,
        acknowledgedAt: row.acknowledged_at,
        resolved: row.resolved,
        resolvedAt: row.resolved_at,
      }));
    } catch (error) {
      this.logger.error('Error fetching alert history', error);
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(historyId: number, userId: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE alert_history
         SET acknowledged = true,
             acknowledged_by = $1,
             acknowledged_at = NOW()
         WHERE history_id = $2`,
        [userId, historyId]
      );

      this.logger.info(`Alert ${historyId} acknowledged by ${userId}`);
    } catch (error) {
      this.logger.error('Error acknowledging alert', error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(historyId: number): Promise<void> {
    try {
      await this.db.query(
        `UPDATE alert_history
         SET resolved = true,
             resolved_at = NOW()
         WHERE history_id = $1`,
        [historyId]
      );

      this.logger.info(`Alert ${historyId} resolved`);
    } catch (error) {
      this.logger.error('Error resolving alert', error);
      throw error;
    }
  }

  /**
   * Helper: Get metric table name
   */
  private getMetricTable(category: string): string {
    const tableMap: { [key: string]: string } = {
      'user': 'metrics_daily_users',
      'trading': 'metrics_daily_trading',
      'financial': 'metrics_daily_financial',
      'wallet': 'metrics_daily_wallet',
      'operational': 'metrics_hourly_operational',
      'security': 'metrics_daily_security',
      'marketing': 'metrics_daily_marketing',
      'compliance': 'metrics_daily_compliance',
      'engagement': 'metrics_daily_engagement',
    };

    return tableMap[category] || 'metrics_daily_users';
  }

  /**
   * Helper: Convert metric name to column name
   */
  private convertMetricNameToColumn(metricName: string): string {
    // Convert camelCase or spaces to snake_case
    return metricName
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/\s+/g, '_');
  }

  /**
   * Helper: Get numeric columns from table
   */
  private async getNumericColumns(table: string): Promise<string[]> {
    const query = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      AND data_type IN ('integer', 'bigint', 'numeric', 'decimal', 'real', 'double precision')
      AND column_name NOT IN ('time', 'id')
    `;

    const result = await this.db.query(query, [table]);
    return result.rows.map(row => row.column_name);
  }
}
