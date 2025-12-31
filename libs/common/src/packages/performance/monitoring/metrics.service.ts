import { Injectable, Logger } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, Summary } from 'prom-client';

/**
 * Metrics service for Application Performance Monitoring (APM)
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly registry: Registry;

  // HTTP Metrics
  private readonly httpRequestDuration: Histogram;
  private readonly httpRequestTotal: Counter;
  private readonly httpRequestErrors: Counter;

  // Database Metrics
  private readonly dbQueryDuration: Histogram;
  private readonly dbConnectionPool: Gauge;
  private readonly dbQueryErrors: Counter;

  // Cache Metrics
  private readonly cacheHits: Counter;
  private readonly cacheMisses: Counter;
  private readonly cacheLatency: Histogram;

  // WebSocket Metrics
  private readonly wsConnections: Gauge;
  private readonly wsMessagesSent: Counter;
  private readonly wsMessagesReceived: Counter;

  // Trading Metrics
  private readonly ordersCreated: Counter;
  private readonly ordersMatched: Counter;
  private readonly orderMatchingLatency: Histogram;
  private readonly tradesExecuted: Counter;

  // Queue Metrics
  private readonly jobsQueued: Counter;
  private readonly jobsProcessed: Counter;
  private readonly jobProcessingDuration: Histogram;
  private readonly jobsFailed: Counter;

  // Business Metrics
  private readonly activeUsers: Gauge;
  private readonly tradingVolume: Summary;
  private readonly revenue: Counter;

  constructor() {
    this.registry = new Registry();

    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.registry],
    });

    // Database Metrics
    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.dbConnectionPool = new Gauge({
      name: 'db_connection_pool',
      help: 'Database connection pool status',
      labelNames: ['state'], // active, idle, waiting
      registers: [this.registry],
    });

    this.dbQueryErrors = new Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['query_type', 'error_type'],
      registers: [this.registry],
    });

    // Cache Metrics
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_layer', 'key_pattern'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_layer', 'key_pattern'],
      registers: [this.registry],
    });

    this.cacheLatency = new Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Duration of cache operations',
      labelNames: ['operation', 'cache_layer'],
      buckets: [0.0001, 0.001, 0.005, 0.01, 0.05, 0.1],
      registers: [this.registry],
    });

    // WebSocket Metrics
    this.wsConnections = new Gauge({
      name: 'websocket_connections',
      help: 'Number of active WebSocket connections',
      registers: [this.registry],
    });

    this.wsMessagesSent = new Counter({
      name: 'websocket_messages_sent_total',
      help: 'Total number of WebSocket messages sent',
      labelNames: ['event_type'],
      registers: [this.registry],
    });

    this.wsMessagesReceived = new Counter({
      name: 'websocket_messages_received_total',
      help: 'Total number of WebSocket messages received',
      labelNames: ['event_type'],
      registers: [this.registry],
    });

    // Trading Metrics
    this.ordersCreated = new Counter({
      name: 'orders_created_total',
      help: 'Total number of orders created',
      labelNames: ['symbol', 'side', 'type'],
      registers: [this.registry],
    });

    this.ordersMatched = new Counter({
      name: 'orders_matched_total',
      help: 'Total number of orders matched',
      labelNames: ['symbol'],
      registers: [this.registry],
    });

    this.orderMatchingLatency = new Histogram({
      name: 'order_matching_duration_seconds',
      help: 'Duration of order matching process',
      labelNames: ['symbol'],
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05],
      registers: [this.registry],
    });

    this.tradesExecuted = new Counter({
      name: 'trades_executed_total',
      help: 'Total number of trades executed',
      labelNames: ['symbol', 'side'],
      registers: [this.registry],
    });

    // Queue Metrics
    this.jobsQueued = new Counter({
      name: 'jobs_queued_total',
      help: 'Total number of jobs queued',
      labelNames: ['queue_name', 'job_type'],
      registers: [this.registry],
    });

    this.jobsProcessed = new Counter({
      name: 'jobs_processed_total',
      help: 'Total number of jobs processed',
      labelNames: ['queue_name', 'job_type', 'status'],
      registers: [this.registry],
    });

    this.jobProcessingDuration = new Histogram({
      name: 'job_processing_duration_seconds',
      help: 'Duration of job processing',
      labelNames: ['queue_name', 'job_type'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
      registers: [this.registry],
    });

    this.jobsFailed = new Counter({
      name: 'jobs_failed_total',
      help: 'Total number of failed jobs',
      labelNames: ['queue_name', 'job_type', 'error_type'],
      registers: [this.registry],
    });

    // Business Metrics
    this.activeUsers = new Gauge({
      name: 'active_users',
      help: 'Number of active users',
      labelNames: ['time_window'], // 1m, 5m, 1h, 24h
      registers: [this.registry],
    });

    this.tradingVolume = new Summary({
      name: 'trading_volume',
      help: 'Trading volume summary',
      labelNames: ['symbol', 'time_window'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    this.revenue = new Counter({
      name: 'revenue_total',
      help: 'Total revenue',
      labelNames: ['revenue_type'], // trading_fee, withdrawal_fee, etc.
      registers: [this.registry],
    });

    this.logger.log('Metrics service initialized');
  }

  // HTTP Metrics Methods
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(duration);
    this.httpRequestTotal.labels(method, route, statusCode.toString()).inc();
  }

  recordHttpError(method: string, route: string, errorType: string) {
    this.httpRequestErrors.labels(method, route, errorType).inc();
  }

  // Database Metrics Methods
  recordDbQuery(queryType: string, table: string, duration: number) {
    this.dbQueryDuration.labels(queryType, table).observe(duration);
  }

  setDbConnectionPool(active: number, idle: number, waiting: number) {
    this.dbConnectionPool.labels('active').set(active);
    this.dbConnectionPool.labels('idle').set(idle);
    this.dbConnectionPool.labels('waiting').set(waiting);
  }

  recordDbError(queryType: string, errorType: string) {
    this.dbQueryErrors.labels(queryType, errorType).inc();
  }

  // Cache Metrics Methods
  recordCacheHit(layer: string, keyPattern: string) {
    this.cacheHits.labels(layer, keyPattern).inc();
  }

  recordCacheMiss(layer: string, keyPattern: string) {
    this.cacheMisses.labels(layer, keyPattern).inc();
  }

  recordCacheOperation(operation: string, layer: string, duration: number) {
    this.cacheLatency.labels(operation, layer).observe(duration);
  }

  getCacheHitRatio(layer: string, keyPattern: string): number {
    const hits = this.cacheHits.labels(layer, keyPattern);
    const misses = this.cacheMisses.labels(layer, keyPattern);
    // This is a simplified calculation
    return 0; // Implement based on actual counter values
  }

  // WebSocket Metrics Methods
  setWsConnections(count: number) {
    this.wsConnections.set(count);
  }

  recordWsMessageSent(eventType: string) {
    this.wsMessagesSent.labels(eventType).inc();
  }

  recordWsMessageReceived(eventType: string) {
    this.wsMessagesReceived.labels(eventType).inc();
  }

  // Trading Metrics Methods
  recordOrderCreated(symbol: string, side: string, type: string) {
    this.ordersCreated.labels(symbol, side, type).inc();
  }

  recordOrderMatched(symbol: string, duration: number) {
    this.ordersMatched.labels(symbol).inc();
    this.orderMatchingLatency.labels(symbol).observe(duration);
  }

  recordTradeExecuted(symbol: string, side: string, volume: number) {
    this.tradesExecuted.labels(symbol, side).inc();
    this.tradingVolume.labels(symbol, '1m').observe(volume);
  }

  // Queue Metrics Methods
  recordJobQueued(queueName: string, jobType: string) {
    this.jobsQueued.labels(queueName, jobType).inc();
  }

  recordJobProcessed(queueName: string, jobType: string, status: string, duration: number) {
    this.jobsProcessed.labels(queueName, jobType, status).inc();
    this.jobProcessingDuration.labels(queueName, jobType).observe(duration);
  }

  recordJobFailed(queueName: string, jobType: string, errorType: string) {
    this.jobsFailed.labels(queueName, jobType, errorType).inc();
  }

  // Business Metrics Methods
  setActiveUsers(count: number, timeWindow: string) {
    this.activeUsers.labels(timeWindow).set(count);
  }

  recordRevenue(amount: number, revenueType: string) {
    this.revenue.labels(revenueType).inc(amount);
  }

  // Get Metrics for Prometheus
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  // Get Registry
  getRegistry(): Registry {
    return this.registry;
  }
}
