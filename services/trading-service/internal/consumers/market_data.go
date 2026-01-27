package consumers

import (
	"context"
	"encoding/json"
	"time"

	"github.com/trading-platform/trading-service/internal/cache"
	"github.com/trading-platform/trading-service/internal/messaging"
	"github.com/trading-platform/trading-service/internal/types"
	"go.uber.org/zap"
)

// MarketDataConsumer consumes events from market data service
type MarketDataConsumer struct {
	kafka  *messaging.KafkaConsumer
	cache  *cache.MultiLayerCache
	logger *zap.Logger
}

// NewMarketDataConsumer creates a new market data consumer
func NewMarketDataConsumer(
	kafka *messaging.KafkaConsumer,
	cache *cache.MultiLayerCache,
	logger *zap.Logger,
) *MarketDataConsumer {
	return &MarketDataConsumer{
		kafka:  kafka,
		cache:  cache,
		logger: logger,
	}
}

// Start starts consuming market data events
func (c *MarketDataConsumer) Start(ctx context.Context) error {
	// Subscribe to ticker updates
	if err := c.kafka.Subscribe(ctx, messaging.TopicMarketDataTicker, c.handleTickerUpdate); err != nil {
		return err
	}

	// Subscribe to orderbook updates
	if err := c.kafka.Subscribe(ctx, messaging.TopicMarketDataOrderbook, c.handleOrderbookUpdate); err != nil {
		return err
	}

	// Subscribe to trade updates
	if err := c.kafka.Subscribe(ctx, messaging.TopicMarketDataTrades, c.handleTradeUpdate); err != nil {
		return err
	}

	c.logger.Info("✅ Market data consumer started")
	return nil
}

// handleTickerUpdate handles ticker updates
func (c *MarketDataConsumer) handleTickerUpdate(data []byte) error {
	var ticker types.Ticker
	if err := json.Unmarshal(data, &ticker); err != nil {
		c.logger.Error("Failed to unmarshal ticker", zap.Error(err))
		return err
	}

	// Update cache
	ctx := context.Background()
	if err := c.cache.SetTicker(ctx, ticker.TradingPair, data, 5*time.Second); err != nil {
		c.logger.Error("Failed to cache ticker", zap.Error(err))
	}

	return nil
}

// handleOrderbookUpdate handles orderbook updates
func (c *MarketDataConsumer) handleOrderbookUpdate(data []byte) error {
	var orderbook types.OrderBook
	if err := json.Unmarshal(data, &orderbook); err != nil {
		c.logger.Error("Failed to unmarshal orderbook", zap.Error(err))
		return err
	}

	// Update cache with short TTL for orderbook
	ctx := context.Background()
	if err := c.cache.SetOrderBook(ctx, orderbook.TradingPair, data, time.Second); err != nil {
		c.logger.Error("Failed to cache orderbook", zap.Error(err))
	}

	return nil
}

// handleTradeUpdate handles trade updates from market data
func (c *MarketDataConsumer) handleTradeUpdate(data []byte) error {
	// Process trade updates for analytics, risk management, etc.
	c.logger.Debug("Trade update received from market data")
	return nil
}
