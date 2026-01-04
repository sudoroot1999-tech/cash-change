package consumers

import (
	"context"
	"encoding/json"

	"github.com/trading-platform/market-data-service/internal/cache"
	"github.com/trading-platform/market-data-service/internal/messaging"
	"github.com/trading-platform/market-data-service/internal/types"
	"github.com/trading-platform/market-data-service/internal/websocket"
	"go.uber.org/zap"
)

// MatchingEngineConsumer consumes events from matching engine
type MatchingEngineConsumer struct {
	rabbitmq      *messaging.RabbitMQClient
	kafkaConsumer *messaging.KafkaConsumer
	kafkaProducer *messaging.KafkaProducer
	cache         *cache.MultiLayerCache
	wsHub         *websocket.Hub
	logger        *zap.Logger
}

// NewMatchingEngineConsumer creates a new matching engine consumer
func NewMatchingEngineConsumer(
	rabbitmq *messaging.RabbitMQClient,
	kafkaConsumer *messaging.KafkaConsumer,
	kafkaProducer *messaging.KafkaProducer,
	cache *cache.MultiLayerCache,
	wsHub *websocket.Hub,
	logger *zap.Logger,
) *MatchingEngineConsumer {
	return &MatchingEngineConsumer{
		rabbitmq:      rabbitmq,
		kafkaConsumer: kafkaConsumer,
		kafkaProducer: kafkaProducer,
		cache:         cache,
		wsHub:         wsHub,
		logger:        logger,
	}
}

// Start starts consuming matching engine events
func (c *MatchingEngineConsumer) Start(ctx context.Context) error {
	// Subscribe to RabbitMQ orderbook updates
	if err := c.rabbitmq.Subscribe(messaging.QueueMatchingOrderbookUpdate, c.handleOrderbookUpdate); err != nil {
		c.logger.Error("Failed to subscribe to orderbook updates", zap.Error(err))
	}

	// Subscribe to Kafka matching engine events
	if err := c.kafkaConsumer.Subscribe(ctx, messaging.TopicMatchingEngineEvents, c.handleMatchingEngineEvent); err != nil {
		c.logger.Error("Failed to subscribe to matching engine events", zap.Error(err))
	}

	// Subscribe to Kafka orderbook snapshots
	if err := c.kafkaConsumer.Subscribe(ctx, messaging.TopicOrderbookSnapshots, c.handleOrderbookSnapshot); err != nil {
		c.logger.Error("Failed to subscribe to orderbook snapshots", zap.Error(err))
	}

	c.logger.Info("✅ Matching engine consumer started")
	return nil
}

// handleOrderbookUpdate handles orderbook updates from matching engine
func (c *MatchingEngineConsumer) handleOrderbookUpdate(data []byte) error {
	var event struct {
		Type        string          `json:"type"`
		TradingPair string          `json:"trading_pair"`
		Orderbook   types.OrderBook `json:"orderbook"`
	}

	if err := json.Unmarshal(data, &event); err != nil {
		c.logger.Error("Failed to unmarshal orderbook update", zap.Error(err))
		return err
	}

	ctx := context.Background()

	// Update cache with internal orderbook data
	event.Orderbook.Source = types.DataSourceInternal
	orderbookData, _ := json.Marshal(event.Orderbook)
	if err := c.cache.SetOrderbook(ctx, event.TradingPair, orderbookData, 1); err != nil {
		c.logger.Error("Failed to cache orderbook", zap.Error(err))
	}

	// Publish to Kafka for other services
	if err := c.kafkaProducer.ProduceOrderbook(ctx, event.Orderbook, event.TradingPair); err != nil {
		c.logger.Error("Failed to publish orderbook to Kafka", zap.Error(err))
	}

	// Broadcast to WebSocket clients
	if c.wsHub != nil {
		c.wsHub.Broadcast("orderbook:"+event.TradingPair, event.Orderbook)
	}

	return nil
}

// handleMatchingEngineEvent handles general matching engine events
func (c *MatchingEngineConsumer) handleMatchingEngineEvent(data []byte) error {
	var event struct {
		Type      string          `json:"type"`
		Timestamp int64           `json:"timestamp"`
		Data      json.RawMessage `json:"data"`
	}

	if err := json.Unmarshal(data, &event); err != nil {
		c.logger.Error("Failed to unmarshal matching engine event", zap.Error(err))
		return err
	}

	switch event.Type {
	case "TRADE_EXECUTED":
		return c.handleTradeExecuted(event.Data)
	case "ORDER_MATCHED":
		return c.handleOrderMatched(event.Data)
	}

	return nil
}

// handleTradeExecuted handles trade executed events
func (c *MatchingEngineConsumer) handleTradeExecuted(data json.RawMessage) error {
	var trade types.Trade
	if err := json.Unmarshal(data, &trade); err != nil {
		return err
	}

	trade.Source = types.DataSourceInternal
	ctx := context.Background()

	// Publish to Kafka
	if err := c.kafkaProducer.ProduceTrade(ctx, trade, trade.TradingPair); err != nil {
		c.logger.Error("Failed to publish trade to Kafka", zap.Error(err))
	}

	// Broadcast to WebSocket clients
	if c.wsHub != nil {
		c.wsHub.Broadcast("trade:"+trade.TradingPair, trade)
	}

	return nil
}

// handleOrderMatched handles order matched events
func (c *MatchingEngineConsumer) handleOrderMatched(data json.RawMessage) error {
	// Process order matched event
	c.logger.Debug("Order matched event received")
	return nil
}

// handleOrderbookSnapshot handles orderbook snapshots from Kafka
func (c *MatchingEngineConsumer) handleOrderbookSnapshot(data []byte) error {
	var orderbook types.OrderBook
	if err := json.Unmarshal(data, &orderbook); err != nil {
		c.logger.Error("Failed to unmarshal orderbook snapshot", zap.Error(err))
		return err
	}

	ctx := context.Background()

	// Update cache
	if err := c.cache.SetOrderbook(ctx, orderbook.TradingPair, data, 1); err != nil {
		c.logger.Error("Failed to cache orderbook snapshot", zap.Error(err))
	}

	// Broadcast to WebSocket clients
	if c.wsHub != nil {
		c.wsHub.Broadcast("orderbook:"+orderbook.TradingPair, orderbook)
	}

	return nil
}
