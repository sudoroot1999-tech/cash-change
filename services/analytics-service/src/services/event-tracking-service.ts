import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';
import { query } from '../config/database';
import { Client } from '@elastic/elasticsearch';
import { elasticsearchClient } from '../config/elasticsearch';

export interface UserEvent {
  event_id: string;
  user_id: string;
  event_type: string;
  event_category: 'navigation' | 'transaction' | 'interaction' | 'system';
  properties: Record<string, any>;
  timestamp: Date;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  page_url?: string;
}

export interface TransactionEvent {
  event_id: string;
  user_id: string;
  transaction_type: 'deposit' | 'withdrawal' | 'trade' | 'transfer';
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface TradingEvent {
  event_id: string;
  user_id: string;
  trading_pair: string;
  order_type: 'market' | 'limit' | 'stop_loss' | 'stop_limit';
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  filled_amount?: number;
  status: string;
  timestamp: Date;
}

export interface SystemMetric {
  metric_id: string;
  metric_name: string;
  metric_value: number;
  service: string;
  tags: Record<string, string>;
  timestamp: Date;
}

export class EventTrackingService {
  private redis;
  private elasticsearch: Client;
  private batchQueue: any[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.redis = redisClient;
    this.elasticsearch = elasticsearchClient;
    
    // Start batch flushing
    setInterval(() => this.flushBatch(), this.FLUSH_INTERVAL);
  }

  /**
   * Track user event
   */
  async trackUserEvent(event: UserEvent): Promise<void> {
    try {
      // Add to batch queue
      this.batchQueue.push({
        type: 'user_event',
        data: event,
      });

      // Stream to Redis for real-time processing
      await this.redis.xadd(
        'user_events_stream',
        '*',
        'event_id', event.event_id,
        'user_id', event.user_id,
        'event_type', event.event_type,
        'event_category', event.event_category,
        'properties', JSON.stringify(event.properties),
        'timestamp', event.timestamp.toISOString()
      );

      // Check if batch is full
      if (this.batchQueue.length >= this.BATCH_SIZE) {
        await this.flushBatch();
      }

      // Update real-time counters
      await this.updateRealTimeCounters('user_event', event);

    } catch (error) {
      logger.error('Error tracking user event', error);
      throw error;
    }
  }

  /**
   * Track transaction event
   */
  async trackTransactionEvent(event: TransactionEvent): Promise<void> {
    try {
      this.batchQueue.push({
        type: 'transaction_event',
        data: event,
      });

      // Stream to Redis
      await this.redis.xadd(
        'transaction_events_stream',
        '*',
        'event_id', event.event_id,
        'user_id', event.user_id,
        'transaction_type', event.transaction_type,
        'amount', event.amount.toString(),
        'currency', event.currency,
        'status', event.status,
        'timestamp', event.timestamp.toISOString()
      );

      if (this.batchQueue.length >= this.BATCH_SIZE) {
        await this.flushBatch();
      }

      await this.updateRealTimeCounters('transaction', event);

    } catch (error) {
      logger.error('Error tracking transaction event', error);
      throw error;
    }
  }

  /**
   * Track trading event
   */
  async trackTradingEvent(event: TradingEvent): Promise<void> {
    try {
      this.batchQueue.push({
        type: 'trading_event',
        data: event,
      });

      // Stream to Redis
      await this.redis.xadd(
        'trading_events_stream',
        '*',
        'event_id', event.event_id,
        'user_id', event.user_id,
        'trading_pair', event.trading_pair,
        'order_type', event.order_type,
        'side', event.side,
        'amount', event.amount.toString(),
        'status', event.status,
        'timestamp', event.timestamp.toISOString()
      );

      if (this.batchQueue.length >= this.BATCH_SIZE) {
        await this.flushBatch();
      }

      await this.updateRealTimeCounters('trading', event);

    } catch (error) {
      logger.error('Error tracking trading event', error);
      throw error;
    }
  }

  /**
   * Track system metric
   */
  async trackSystemMetric(metric: SystemMetric): Promise<void> {
    try {
      this.batchQueue.push({
        type: 'system_metric',
        data: metric,
      });

      // Store in Redis for real-time monitoring
      await this.redis.zadd(
        `metrics:${metric.service}:${metric.metric_name}`,
        metric.timestamp.getTime(),
        JSON.stringify({
          value: metric.metric_value,
          tags: metric.tags,
        })
      );

      if (this.batchQueue.length >= this.BATCH_SIZE) {
        await this.flushBatch();
      }

    } catch (error) {
      logger.error('Error tracking system metric', error);
      throw error;
    }
  }

  /**
   * Flush batch to database and Elasticsearch
   */
  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      // Group by type for efficient bulk insert
      const userEvents = batch.filter(b => b.type === 'user_event').map(b => b.data);
      const transactionEvents = batch.filter(b => b.type === 'transaction_event').map(b => b.data);
      const tradingEvents = batch.filter(b => b.type === 'trading_event').map(b => b.data);
      const systemMetrics = batch.filter(b => b.type === 'system_metric').map(b => b.data);

      // Insert into ClickHouse (via database)
      await Promise.all([
        userEvents.length > 0 && this.insertUserEvents(userEvents),
        transactionEvents.length > 0 && this.insertTransactionEvents(transactionEvents),
        tradingEvents.length > 0 && this.insertTradingEvents(tradingEvents),
        systemMetrics.length > 0 && this.insertSystemMetrics(systemMetrics),
      ]);

      // Index in Elasticsearch for search
      if (batch.length > 0) {
        await this.bulkIndexElasticsearch(batch);
      }

      logger.info(`Flushed ${batch.length} events to storage`);

    } catch (error) {
      logger.error('Error flushing batch', error);
      // Re-add failed items back to queue
      this.batchQueue = [...batch, ...this.batchQueue];
    }
  }

  /**
   * Insert user events into database
   */
  private async insertUserEvents(events: UserEvent[]): Promise<void> {
    const values = events.map(e => 
      `('${e.event_id}', '${e.user_id}', '${e.event_type}', '${e.event_category}', 
        '${JSON.stringify(e.properties).replace(/'/g, "''")}', '${e.timestamp.toISOString()}',
        '${e.session_id || ''}', '${e.ip_address || ''}', '${e.user_agent || ''}',
        '${e.device_type || ''}', '${e.page_url || ''}')`
    ).join(',');

    await query(`
      INSERT INTO user_events 
      (event_id, user_id, event_type, event_category, properties, timestamp, 
       session_id, ip_address, user_agent, device_type, page_url)
      VALUES ${values}
      ON CONFLICT (event_id) DO NOTHING
    `);
  }

  /**
   * Insert transaction events into database
   */
  private async insertTransactionEvents(events: TransactionEvent[]): Promise<void> {
    const values = events.map(e => 
      `('${e.event_id}', '${e.user_id}', '${e.transaction_type}', ${e.amount}, 
        '${e.currency}', '${e.status}', '${JSON.stringify(e.metadata).replace(/'/g, "''")}',
        '${e.timestamp.toISOString()}')`
    ).join(',');

    await query(`
      INSERT INTO transaction_events 
      (event_id, user_id, transaction_type, amount, currency, status, metadata, timestamp)
      VALUES ${values}
      ON CONFLICT (event_id) DO NOTHING
    `);
  }

  /**
   * Insert trading events into database
   */
  private async insertTradingEvents(events: TradingEvent[]): Promise<void> {
    const values = events.map(e => 
      `('${e.event_id}', '${e.user_id}', '${e.trading_pair}', '${e.order_type}', 
        '${e.side}', ${e.amount}, ${e.price || 'NULL'}, ${e.filled_amount || 'NULL'},
        '${e.status}', '${e.timestamp.toISOString()}')`
    ).join(',');

    await query(`
      INSERT INTO trading_events 
      (event_id, user_id, trading_pair, order_type, side, amount, price, 
       filled_amount, status, timestamp)
      VALUES ${values}
      ON CONFLICT (event_id) DO NOTHING
    `);
  }

  /**
   * Insert system metrics into database
   */
  private async insertSystemMetrics(metrics: SystemMetric[]): Promise<void> {
    const values = metrics.map(m => 
      `('${m.metric_id}', '${m.metric_name}', ${m.metric_value}, '${m.service}',
        '${JSON.stringify(m.tags).replace(/'/g, "''")}', '${m.timestamp.toISOString()}')`
    ).join(',');

    await query(`
      INSERT INTO system_metrics 
      (metric_id, metric_name, metric_value, service, tags, timestamp)
      VALUES ${values}
      ON CONFLICT (metric_id) DO NOTHING
    `);
  }

  /**
   * Bulk index in Elasticsearch
   */
  private async bulkIndexElasticsearch(batch: any[]): Promise<void> {
    const body = batch.flatMap(item => {
      const indexName = `events-${item.type}-${new Date().toISOString().slice(0, 7)}`;
      return [
        { index: { _index: indexName, _id: item.data.event_id || item.data.metric_id } },
        item.data,
      ];
    });

    await this.elasticsearch.bulk({ body });
  }

  /**
   * Update real-time counters in Redis
   */
  private async updateRealTimeCounters(eventType: string, event: any): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const hour = new Date().toISOString().slice(0, 13);

    await Promise.all([
      // Daily counters
      this.redis.hincrby(`counters:${eventType}:daily:${today}`, 'total', 1),
      // Hourly counters
      this.redis.hincrby(`counters:${eventType}:hourly:${hour}`, 'total', 1),
      // User-specific counters
      event.user_id && this.redis.hincrby(`counters:user:${event.user_id}:${today}`, eventType, 1),
    ]);

    // Set TTL on counters (30 days)
    await this.redis.expire(`counters:${eventType}:daily:${today}`, 30 * 24 * 60 * 60);
    await this.redis.expire(`counters:${eventType}:hourly:${hour}`, 7 * 24 * 60 * 60);
  }

  /**
   * Get real-time event counts
   */
  async getEventCounts(eventType: string, period: 'hourly' | 'daily' = 'daily'): Promise<number> {
    const date = period === 'daily' 
      ? new Date().toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 13);

    const count = await this.redis.hget(`counters:${eventType}:${period}:${date}`, 'total');
    return parseInt(count || '0', 10);
  }

  /**
   * Get event stream
   */
  async getEventStream(streamName: string, count: number = 100): Promise<any[]> {
    const results = await this.redis.xrevrange(streamName, '+', '-', 'COUNT', count);
    return results.map((result: any) => {
      const [id, fields] = result;
      const event: any = { stream_id: id };
      for (let i = 0; i < fields.length; i += 2) {
        const key = fields[i];
        const value = fields[i + 1];
        event[key] = key === 'properties' || key === 'metadata' ? JSON.parse(value) : value;
      }
      return event;
    });
  }
}

export const eventTrackingService = new EventTrackingService();
