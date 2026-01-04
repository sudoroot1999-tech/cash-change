package consumers

import (
	"context"
	"encoding/json"

	"github.com/trading-platform/market-data-service/internal/cache"
	"github.com/trading-platform/market-data-service/internal/messaging"
	"github.com/trading-platform/market-data-service/internal/websocket"
	"go.uber.org/zap"
)

// TradingConsumer consumes events from trading service
type TradingConsumer struct {
	rabbitmq      *messaging.RabbitMQClient
	kafkaConsumer *messaging.KafkaConsumer
	cache         *cache.MultiLayerCache
	wsHub         *websocket.Hub
	logger        *zap.Logger
}

// NewTradingConsumer creates a new trading consumer
func NewTradingConsumer(
	rabbitmq *messaging.RabbitMQClient,
	kafkaConsumer *messaging.KafkaConsumer,
	cache *cache.MultiLayerCache,
	wsHub *websocket.Hub,
	logger *zap.Logger,
) *TradingConsumer {
	return &TradingConsumer{
		rabbitmq:      rabbitmq,
		kafkaConsumer: kafkaConsumer,
		cache:         cache,
		wsHub:         wsHub,
		logger:        logger,
	}
}

// Start starts consuming trading events
func (c *TradingConsumer) Start(ctx context.Context) error {
	// Subscribe to Kafka trading events
	if err := c.kafkaConsumer.Subscribe(ctx, messaging.TopicTradingEvents, c.handleTradingEvent); err != nil {
		c.logger.Error("Failed to subscribe to trading events", zap.Error(err))
	}

	c.logger.Info("✅ Trading consumer started")
	return nil
}

// handleTradingEvent handles trading events
func (c *TradingConsumer) handleTradingEvent(data []byte) error {
	var event struct {
		Type      string          `json:"type"`
		Timestamp int64           `json:"timestamp"`
		Data      json.RawMessage `json:"data"`
	}

	if err := json.Unmarshal(data, &event); err != nil {
		c.logger.Error("Failed to unmarshal trading event", zap.Error(err))
		return err
	}

	switch event.Type {
	case "ORDER_PLACED":
		return c.handleOrderPlaced(event.Data)
	case "ORDER_CANCELLED":
		return c.handleOrderCancelled(event.Data)
	case "POSITION_OPENED":
		return c.handlePositionOpened(event.Data)
	case "POSITION_CLOSED":
		return c.handlePositionClosed(event.Data)
	}

	return nil
}

// handleOrderPlaced handles order placed events
func (c *TradingConsumer) handleOrderPlaced(data json.RawMessage) error {
	var order struct {
		ID          string `json:"id"`
		TradingPair string `json:"trading_pair"`
		Side        string `json:"side"`
		Type        string `json:"type"`
		Price       string `json:"price"`
		Quantity    string `json:"quantity"`
	}

	if err := json.Unmarshal(data, &order); err != nil {
		return err
	}

	// Broadcast to WebSocket clients
	if c.wsHub != nil {
		c.wsHub.Broadcast("order:"+order.TradingPair, map[string]interface{}{
			"type":  "ORDER_PLACED",
			"order": order,
		})
	}

	return nil
}

// handleOrderCancelled handles order cancelled events
func (c *TradingConsumer) handleOrderCancelled(data json.RawMessage) error {
	var order struct {
		ID          string `json:"id"`
		TradingPair string `json:"trading_pair"`
	}

	if err := json.Unmarshal(data, &order); err != nil {
		return err
	}

	// Broadcast to WebSocket clients
	if c.wsHub != nil {
		c.wsHub.Broadcast("order:"+order.TradingPair, map[string]interface{}{
			"type":  "ORDER_CANCELLED",
			"order": order,
		})
	}

	return nil
}

// handlePositionOpened handles position opened events
func (c *TradingConsumer) handlePositionOpened(data json.RawMessage) error {
	c.logger.Debug("Position opened event received")
	return nil
}

// handlePositionClosed handles position closed events
func (c *TradingConsumer) handlePositionClosed(data json.RawMessage) error {
	c.logger.Debug("Position closed event received")
	return nil
}
