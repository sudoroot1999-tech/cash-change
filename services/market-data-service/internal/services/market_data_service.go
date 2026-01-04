package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/trading-platform/market-data-service/internal/cache"
	"github.com/trading-platform/market-data-service/internal/jobs"
	"github.com/trading-platform/market-data-service/internal/messaging"
	"github.com/trading-platform/market-data-service/internal/providers"
	"github.com/trading-platform/market-data-service/internal/types"
	"go.uber.org/zap"
)

// MarketDataService is the main service for market data
type MarketDataService struct {
	// Providers
	binance   providers.DataProvider
	coingecko providers.DataProvider

	// Infrastructure
	cache         *cache.MultiLayerCache
	kafkaProducer *messaging.KafkaProducer
	rabbitmq      *messaging.RabbitMQClient

	// Workers
	tickerPool    *jobs.WorkerPool
	orderbookPool *jobs.WorkerPool
	klinePool     *jobs.WorkerPool
	scheduler     *jobs.Scheduler

	// Configuration
	config *ServiceConfig

	// State
	tradingPairs []string
	mu           sync.RWMutex
	ctx          context.Context
	cancel       context.CancelFunc
	logger       *zap.Logger
}

// ServiceConfig holds service configuration
type ServiceConfig struct {
	TickerWorkers         int
	OrderbookWorkers      int
	KlineWorkers          int
	TickerSyncInterval    time.Duration
	KlineSyncInterval     time.Duration
	MarketCapSyncInterval time.Duration
	CacheTTLTicker        time.Duration
	CacheTTLOrderbook     time.Duration
	CacheTTLKline         time.Duration
	CacheTTLMarketCap     time.Duration
}

// NewMarketDataService creates a new market data service
func NewMarketDataService(
	binance providers.DataProvider,
	coingecko providers.DataProvider,
	cache *cache.MultiLayerCache,
	kafkaProducer *messaging.KafkaProducer,
	rabbitmq *messaging.RabbitMQClient,
	config *ServiceConfig,
	logger *zap.Logger,
) *MarketDataService {
	ctx, cancel := context.WithCancel(context.Background())

	svc := &MarketDataService{
		binance:       binance,
		coingecko:     coingecko,
		cache:         cache,
		kafkaProducer: kafkaProducer,
		rabbitmq:      rabbitmq,
		config:        config,
		ctx:           ctx,
		cancel:        cancel,
		logger:        logger,
		tradingPairs:  getDefaultTradingPairs(),
	}

	// Initialize worker pools
	svc.tickerPool = jobs.NewWorkerPool("ticker", config.TickerWorkers, 1000, logger)
	svc.orderbookPool = jobs.NewWorkerPool("orderbook", config.OrderbookWorkers, 500, logger)
	svc.klinePool = jobs.NewWorkerPool("kline", config.KlineWorkers, 200, logger)

	// Register handlers
	svc.registerHandlers()

	// Initialize scheduler
	svc.scheduler = jobs.NewScheduler(svc.tickerPool, logger)
	svc.setupScheduledJobs()

	return svc
}


func getDefaultTradingPairs() []string {
	return []string{
		"BTCUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT",
		"SOLUSDT", "DOTUSDT", "DOGEUSDT", "AVAXUSDT", "MATICUSDT",
		"LINKUSDT", "UNIUSDT", "ATOMUSDT", "LTCUSDT", "ETCUSDT",
	}
}

func (s *MarketDataService) registerHandlers() {
	// Ticker sync handler
	s.tickerPool.RegisterHandler(jobs.JobTypeSyncTicker, func(ctx context.Context, job *jobs.Job) error {
		pairs, ok := job.Payload.([]string)
		if !ok {
			pairs = s.tradingPairs
		}
		return s.syncTickers(ctx, pairs)
	})

	// Orderbook sync handler
	s.orderbookPool.RegisterHandler(jobs.JobTypeSyncOrderbook, func(ctx context.Context, job *jobs.Job) error {
		pair, ok := job.Payload.(string)
		if !ok {
			return fmt.Errorf("invalid payload for orderbook sync")
		}
		return s.syncOrderbook(ctx, pair)
	})

	// Kline sync handler
	s.klinePool.RegisterHandler(jobs.JobTypeSyncKline, func(ctx context.Context, job *jobs.Job) error {
		payload, ok := job.Payload.(map[string]string)
		if !ok {
			return fmt.Errorf("invalid payload for kline sync")
		}
		return s.syncKlines(ctx, payload["pair"], payload["interval"])
	})

	// Market info sync handler
	s.tickerPool.RegisterHandler(jobs.JobTypeSyncMarketInfo, func(ctx context.Context, job *jobs.Job) error {
		symbol, ok := job.Payload.(string)
		if !ok {
			return fmt.Errorf("invalid payload for market info sync")
		}
		return s.syncMarketInfo(ctx, symbol)
	})
}

func (s *MarketDataService) setupScheduledJobs() {
	// Ticker sync every 5 seconds
	s.scheduler.AddJob(&jobs.ScheduledJob{
		Name:     "ticker_sync",
		Type:     jobs.JobTypeSyncTicker,
		Interval: s.config.TickerSyncInterval,
		Payload:  s.tradingPairs,
		Enabled:  true,
	})

	// Market info sync every 5 minutes
	s.scheduler.AddJob(&jobs.ScheduledJob{
		Name:     "market_info_sync",
		Type:     jobs.JobTypeSyncMarketInfo,
		Interval: s.config.MarketCapSyncInterval,
		Payload:  "BTC",
		Enabled:  true,
	})
}

// Start starts the market data service
func (s *MarketDataService) Start() error {
	s.logger.Info("🚀 Starting Market Data Service")

	// Start worker pools
	s.tickerPool.Start()
	s.orderbookPool.Start()
	s.klinePool.Start()

	// Start scheduler
	s.scheduler.Start()

	// Start WebSocket subscriptions for real-time data
	go s.startRealtimeSubscriptions()

	s.logger.Info("✅ Market Data Service started")
	return nil
}

// Stop stops the market data service
func (s *MarketDataService) Stop() {
	s.logger.Info("Stopping Market Data Service")
	s.cancel()
	s.scheduler.Stop()
	s.tickerPool.Stop()
	s.orderbookPool.Stop()
	s.klinePool.Stop()
	s.logger.Info("Market Data Service stopped")
}


// syncTickers syncs ticker data from providers
func (s *MarketDataService) syncTickers(ctx context.Context, pairs []string) error {
	// Try Binance first (real-time data)
	tickers, err := s.binance.GetTickers(ctx, pairs)
	if err != nil {
		s.logger.Warn("Failed to get tickers from Binance, trying CoinGecko", zap.Error(err))
		tickers, err = s.coingecko.GetTickers(ctx, pairs)
		if err != nil {
			return fmt.Errorf("failed to get tickers: %w", err)
		}
	}

	for _, ticker := range tickers {
		// Cache the ticker
		data, _ := json.Marshal(ticker)
		if err := s.cache.SetTicker(ctx, ticker.TradingPair, data, s.config.CacheTTLTicker); err != nil {
			s.logger.Error("Failed to cache ticker", zap.String("pair", ticker.TradingPair), zap.Error(err))
		}

		// Publish to Kafka
		if err := s.kafkaProducer.ProduceTicker(ctx, ticker, ticker.TradingPair); err != nil {
			s.logger.Error("Failed to publish ticker to Kafka", zap.Error(err))
		}

		// Publish to RabbitMQ
		if err := s.rabbitmq.Publish(ctx, messaging.ExchangeMarketDataEvents, messaging.RoutingKeyTickerUpdated, ticker); err != nil {
			s.logger.Error("Failed to publish ticker to RabbitMQ", zap.Error(err))
		}
	}

	return nil
}

// syncOrderbook syncs orderbook data
func (s *MarketDataService) syncOrderbook(ctx context.Context, pair string) error {
	orderbook, err := s.binance.GetOrderbook(ctx, pair, 100)
	if err != nil {
		return fmt.Errorf("failed to get orderbook: %w", err)
	}

	// Cache the orderbook
	data, _ := json.Marshal(orderbook)
	if err := s.cache.SetOrderbook(ctx, pair, data, s.config.CacheTTLOrderbook); err != nil {
		s.logger.Error("Failed to cache orderbook", zap.String("pair", pair), zap.Error(err))
	}

	// Publish to Kafka
	if err := s.kafkaProducer.ProduceOrderbook(ctx, orderbook, pair); err != nil {
		s.logger.Error("Failed to publish orderbook to Kafka", zap.Error(err))
	}

	// Publish to RabbitMQ
	if err := s.rabbitmq.Publish(ctx, messaging.ExchangeMarketDataEvents, messaging.RoutingKeyOrderbookUpdated, orderbook); err != nil {
		s.logger.Error("Failed to publish orderbook to RabbitMQ", zap.Error(err))
	}

	return nil
}

// syncKlines syncs kline/candlestick data
func (s *MarketDataService) syncKlines(ctx context.Context, pair, interval string) error {
	klines, err := s.binance.GetKlines(ctx, pair, interval, 500)
	if err != nil {
		return fmt.Errorf("failed to get klines: %w", err)
	}

	// Cache the klines
	data, _ := json.Marshal(klines)
	if err := s.cache.SetKline(ctx, pair, interval, data, s.config.CacheTTLKline); err != nil {
		s.logger.Error("Failed to cache klines", zap.String("pair", pair), zap.Error(err))
	}

	// Publish to Kafka
	if err := s.kafkaProducer.ProduceKline(ctx, klines, pair); err != nil {
		s.logger.Error("Failed to publish klines to Kafka", zap.Error(err))
	}

	return nil
}

// syncMarketInfo syncs market information from CoinGecko
func (s *MarketDataService) syncMarketInfo(ctx context.Context, symbol string) error {
	info, err := s.coingecko.GetMarketInfo(ctx, symbol)
	if err != nil {
		return fmt.Errorf("failed to get market info: %w", err)
	}

	// Cache the market info
	data, _ := json.Marshal(info)
	if err := s.cache.SetMarketInfo(ctx, symbol, data, s.config.CacheTTLMarketCap); err != nil {
		s.logger.Error("Failed to cache market info", zap.String("symbol", symbol), zap.Error(err))
	}

	return nil
}


// startRealtimeSubscriptions starts WebSocket subscriptions for real-time data
func (s *MarketDataService) startRealtimeSubscriptions() {
	// Subscribe to Binance ticker updates
	err := s.binance.SubscribeTicker(s.ctx, s.tradingPairs, func(ticker *types.Ticker) {
		ctx := context.Background()

		// Update cache
		data, _ := json.Marshal(ticker)
		s.cache.SetTicker(ctx, ticker.TradingPair, data, s.config.CacheTTLTicker)

		// Publish to Kafka
		s.kafkaProducer.ProduceTicker(ctx, ticker, ticker.TradingPair)

		// Publish to RabbitMQ
		s.rabbitmq.Publish(ctx, messaging.ExchangeMarketDataEvents, messaging.RoutingKeyTickerUpdated, ticker)
	})
	if err != nil {
		s.logger.Error("Failed to subscribe to ticker updates", zap.Error(err))
	}

	// Subscribe to orderbook updates for top pairs
	topPairs := []string{"BTCUSDT", "ETHUSDT", "BNBUSDT"}
	for _, pair := range topPairs {
		err := s.binance.SubscribeOrderbook(s.ctx, pair, func(orderbook *types.OrderBook) {
			ctx := context.Background()

			// Update cache
			data, _ := json.Marshal(orderbook)
			s.cache.SetOrderbook(ctx, orderbook.TradingPair, data, s.config.CacheTTLOrderbook)

			// Publish to Kafka
			s.kafkaProducer.ProduceOrderbook(ctx, orderbook, orderbook.TradingPair)
		})
		if err != nil {
			s.logger.Error("Failed to subscribe to orderbook updates", zap.String("pair", pair), zap.Error(err))
		}
	}
}

// API Methods

// GetTicker returns ticker for a trading pair
func (s *MarketDataService) GetTicker(ctx context.Context, pair string) (*types.Ticker, error) {
	// Try cache first
	data, err := s.cache.GetTicker(ctx, pair)
	if err == nil {
		var ticker types.Ticker
		if err := json.Unmarshal(data, &ticker); err == nil {
			return &ticker, nil
		}
	}

	// Fetch from provider
	ticker, err := s.binance.GetTicker(ctx, pair)
	if err != nil {
		return nil, err
	}

	// Cache it
	data, _ = json.Marshal(ticker)
	s.cache.SetTicker(ctx, pair, data, s.config.CacheTTLTicker)

	return ticker, nil
}

// GetTickers returns tickers for multiple pairs
func (s *MarketDataService) GetTickers(ctx context.Context, pairs []string) ([]*types.Ticker, error) {
	if len(pairs) == 0 {
		pairs = s.tradingPairs
	}

	var tickers []*types.Ticker
	var missedPairs []string

	// Try cache first
	for _, pair := range pairs {
		data, err := s.cache.GetTicker(ctx, pair)
		if err == nil {
			var ticker types.Ticker
			if err := json.Unmarshal(data, &ticker); err == nil {
				tickers = append(tickers, &ticker)
				continue
			}
		}
		missedPairs = append(missedPairs, pair)
	}

	// Fetch missed pairs from provider
	if len(missedPairs) > 0 {
		fetched, err := s.binance.GetTickers(ctx, missedPairs)
		if err != nil {
			return nil, err
		}
		tickers = append(tickers, fetched...)

		// Cache them
		for _, ticker := range fetched {
			data, _ := json.Marshal(ticker)
			s.cache.SetTicker(ctx, ticker.TradingPair, data, s.config.CacheTTLTicker)
		}
	}

	return tickers, nil
}

// GetOrderbook returns orderbook for a trading pair
func (s *MarketDataService) GetOrderbook(ctx context.Context, pair string, limit int) (*types.OrderBook, error) {
	// Try cache first
	data, err := s.cache.GetOrderbook(ctx, pair)
	if err == nil {
		var orderbook types.OrderBook
		if err := json.Unmarshal(data, &orderbook); err == nil {
			return &orderbook, nil
		}
	}

	// Fetch from provider
	orderbook, err := s.binance.GetOrderbook(ctx, pair, limit)
	if err != nil {
		return nil, err
	}

	// Cache it
	data, _ = json.Marshal(orderbook)
	s.cache.SetOrderbook(ctx, pair, data, s.config.CacheTTLOrderbook)

	return orderbook, nil
}

// GetKlines returns kline/candlestick data
func (s *MarketDataService) GetKlines(ctx context.Context, pair, interval string, limit int) ([]*types.Kline, error) {
	// Try cache first
	data, err := s.cache.GetKline(ctx, pair, interval)
	if err == nil {
		var klines []*types.Kline
		if err := json.Unmarshal(data, &klines); err == nil {
			return klines, nil
		}
	}

	// Fetch from provider
	klines, err := s.binance.GetKlines(ctx, pair, interval, limit)
	if err != nil {
		return nil, err
	}

	// Cache it
	data, _ = json.Marshal(klines)
	s.cache.SetKline(ctx, pair, interval, data, s.config.CacheTTLKline)

	return klines, nil
}

// GetRecentTrades returns recent trades
func (s *MarketDataService) GetRecentTrades(ctx context.Context, pair string, limit int) ([]*types.Trade, error) {
	return s.binance.GetRecentTrades(ctx, pair, limit)
}

// GetMarketInfo returns market information
func (s *MarketDataService) GetMarketInfo(ctx context.Context, symbol string) (*types.MarketInfo, error) {
	// Try cache first
	data, err := s.cache.GetMarketInfo(ctx, symbol)
	if err == nil {
		var info types.MarketInfo
		if err := json.Unmarshal(data, &info); err == nil {
			return &info, nil
		}
	}

	// Fetch from CoinGecko
	info, err := s.coingecko.GetMarketInfo(ctx, symbol)
	if err != nil {
		return nil, err
	}

	// Cache it
	data, _ = json.Marshal(info)
	s.cache.SetMarketInfo(ctx, symbol, data, s.config.CacheTTLMarketCap)

	return info, nil
}

// SubmitOrderbookSync submits an orderbook sync job
func (s *MarketDataService) SubmitOrderbookSync(pair string) {
	s.orderbookPool.Submit(&jobs.Job{
		ID:      uuid.New().String(),
		Type:    jobs.JobTypeSyncOrderbook,
		Payload: pair,
	})
}

// SubmitKlineSync submits a kline sync job
func (s *MarketDataService) SubmitKlineSync(pair, interval string) {
	s.klinePool.Submit(&jobs.Job{
		ID:   uuid.New().String(),
		Type: jobs.JobTypeSyncKline,
		Payload: map[string]string{
			"pair":     pair,
			"interval": interval,
		},
	})
}

// GetTradingPairs returns configured trading pairs
func (s *MarketDataService) GetTradingPairs() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.tradingPairs
}

// SetTradingPairs sets the trading pairs to track
func (s *MarketDataService) SetTradingPairs(pairs []string) {
	s.mu.Lock()
	s.tradingPairs = pairs
	s.mu.Unlock()
}

// HealthCheck returns health status
func (s *MarketDataService) HealthCheck(ctx context.Context) map[string]interface{} {
	return map[string]interface{}{
		"binance_healthy":   s.binance.IsHealthy(),
		"coingecko_healthy": s.coingecko.IsHealthy(),
		"cache_healthy":     s.cache.IsHealthy(ctx),
		"ticker_pool":       s.tickerPool.GetMetrics(),
		"orderbook_pool":    s.orderbookPool.GetMetrics(),
		"kline_pool":        s.klinePool.GetMetrics(),
		"cache_metrics":     s.cache.GetMetrics(),
	}
}
