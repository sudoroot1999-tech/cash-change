package consumers

import (
	"context"
	"encoding/json"

	"github.com/trading-platform/trading-service/internal/messaging"
	"go.uber.org/zap"
)

// WalletConsumer consumes events from wallet service
type WalletConsumer struct {
	rabbitmq *messaging.RabbitMQClient
	kafka    *messaging.KafkaConsumer
	logger   *zap.Logger
}

// BalanceUpdateEvent represents a balance update event
type BalanceUpdateEvent struct {
	UserID    string `json:"userId"`
	Asset     string `json:"asset"`
	Available string `json:"available"`
	Locked    string `json:"locked"`
	Type      string `json:"type"`
}

// NewWalletConsumer creates a new wallet consumer
func NewWalletConsumer(
	rabbitmq *messaging.RabbitMQClient,
	kafka *messaging.KafkaConsumer,
	logger *zap.Logger,
) *WalletConsumer {
	return &WalletConsumer{
		rabbitmq: rabbitmq,
		kafka:    kafka,
		logger:   logger,
	}
}

// Start starts consuming wallet events
func (c *WalletConsumer) Start(ctx context.Context) error {
	// Consume balance updates from RabbitMQ
	if err := c.rabbitmq.Consume(messaging.QueueWalletBalanceUpdate, c.handleBalanceUpdate); err != nil {
		return err
	}

	// Consume from Kafka for wallet events
	if err := c.kafka.Subscribe(ctx, messaging.TopicWalletEvents, c.handleWalletEvent); err != nil {
		return err
	}

	c.logger.Info("✅ Wallet consumer started")
	return nil
}

// handleBalanceUpdate handles balance update events
func (c *WalletConsumer) handleBalanceUpdate(data []byte) error {
	var event BalanceUpdateEvent
	if err := json.Unmarshal(data, &event); err != nil {
		c.logger.Error("Failed to unmarshal balance update", zap.Error(err))
		return err
	}

	c.logger.Info("Received balance update",
		zap.String("user_id", event.UserID),
		zap.String("asset", event.Asset),
		zap.String("type", event.Type),
	)

	// Handle balance update logic
	// This could trigger order validation, margin checks, etc.

	return nil
}

// handleWalletEvent handles wallet events from Kafka
func (c *WalletConsumer) handleWalletEvent(data []byte) error {
	var event struct {
		Type    string          `json:"type"`
		Payload json.RawMessage `json:"payload"`
	}

	if err := json.Unmarshal(data, &event); err != nil {
		return err
	}

	switch event.Type {
	case "BALANCE_RESERVED":
		return c.handleBalanceReserved(event.Payload)
	case "BALANCE_RELEASED":
		return c.handleBalanceReleased(event.Payload)
	case "TRADE_SETTLED":
		return c.handleTradeSettled(event.Payload)
	}

	return nil
}

func (c *WalletConsumer) handleBalanceReserved(data []byte) error {
	c.logger.Debug("Balance reserved event received")
	return nil
}

func (c *WalletConsumer) handleBalanceReleased(data []byte) error {
	c.logger.Debug("Balance released event received")
	return nil
}

func (c *WalletConsumer) handleTradeSettled(data []byte) error {
	c.logger.Debug("Trade settled event received")
	return nil
}
