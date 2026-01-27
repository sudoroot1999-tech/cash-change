package consumers

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/trading-platform/trading-service/internal/jobs"
	"github.com/trading-platform/trading-service/internal/messaging"
	"go.uber.org/zap"
)

// SocialTradingConsumer consumes events from social trading service
type SocialTradingConsumer struct {
	rabbitmq    *messaging.RabbitMQClient
	kafka       *messaging.KafkaConsumer
	orderWorker *jobs.WorkerPool
	logger      *zap.Logger
}

// CopyTradeEvent represents a copy trade event
type CopyTradeEvent struct {
	LeaderID      uuid.UUID `json:"leaderId"`
	FollowerID    uuid.UUID `json:"followerId"`
	OriginalOrder struct {
		TradingPair string `json:"tradingPair"`
		Type        string `json:"type"`
		Side        string `json:"side"`
		Price       string `json:"price"`
		Quantity    string `json:"quantity"`
	} `json:"originalOrder"`
	CopyRatio float64 `json:"copyRatio"`
}

// TradeSignalEvent represents a trade signal event
type TradeSignalEvent struct {
	TraderID    uuid.UUID `json:"traderId"`
	TradingPair string    `json:"tradingPair"`
	Signal      string    `json:"signal"` // BUY, SELL, HOLD
	Confidence  float64   `json:"confidence"`
	Reason      string    `json:"reason"`
}

// NewSocialTradingConsumer creates a new social trading consumer
func NewSocialTradingConsumer(
	rabbitmq *messaging.RabbitMQClient,
	kafka *messaging.KafkaConsumer,
	orderWorker *jobs.WorkerPool,
	logger *zap.Logger,
) *SocialTradingConsumer {
	return &SocialTradingConsumer{
		rabbitmq:    rabbitmq,
		kafka:       kafka,
		orderWorker: orderWorker,
		logger:      logger,
	}
}

// Start starts consuming social trading events
func (c *SocialTradingConsumer) Start(ctx context.Context) error {
	// Consume copy trade events from RabbitMQ
	if err := c.rabbitmq.Consume(messaging.QueueSocialCopyTrade, c.handleCopyTrade); err != nil {
		return err
	}

	// Consume from Kafka for social trading events
	if err := c.kafka.Subscribe(ctx, messaging.TopicSocialTradingEvents, c.handleSocialEvent); err != nil {
		return err
	}

	c.logger.Info("✅ Social trading consumer started")
	return nil
}

// handleCopyTrade handles copy trade events
func (c *SocialTradingConsumer) handleCopyTrade(data []byte) error {
	var event CopyTradeEvent
	if err := json.Unmarshal(data, &event); err != nil {
		c.logger.Error("Failed to unmarshal copy trade event", zap.Error(err))
		return err
	}

	c.logger.Info("Received copy trade event",
		zap.String("leader_id", event.LeaderID.String()),
		zap.String("follower_id", event.FollowerID.String()),
		zap.String("trading_pair", event.OriginalOrder.TradingPair),
	)

	// Submit copy trade job
	c.orderWorker.Submit(&jobs.Job{
		ID:      uuid.New().String(),
		Type:    jobs.JobTypeCopyTrade,
		Payload: &event,
	})

	return nil
}

// handleSocialEvent handles social trading events from Kafka
func (c *SocialTradingConsumer) handleSocialEvent(data []byte) error {
	var event struct {
		Type    string          `json:"type"`
		Payload json.RawMessage `json:"payload"`
	}

	if err := json.Unmarshal(data, &event); err != nil {
		return err
	}

	switch event.Type {
	case "TRADE_SIGNAL":
		return c.handleTradeSignal(event.Payload)
	case "COPY_TRADE_CREATED":
		return c.handleCopyTradeCreated(event.Payload)
	case "PERFORMANCE_UPDATE":
		return c.handlePerformanceUpdate(event.Payload)
	}

	return nil
}

func (c *SocialTradingConsumer) handleTradeSignal(data []byte) error {
	var signal TradeSignalEvent
	if err := json.Unmarshal(data, &signal); err != nil {
		return err
	}

	c.logger.Info("Received trade signal",
		zap.String("trader_id", signal.TraderID.String()),
		zap.String("trading_pair", signal.TradingPair),
		zap.String("signal", signal.Signal),
		zap.Float64("confidence", signal.Confidence),
	)

	return nil
}

func (c *SocialTradingConsumer) handleCopyTradeCreated(data []byte) error {
	c.logger.Debug("Copy trade created event received")
	return nil
}

func (c *SocialTradingConsumer) handlePerformanceUpdate(data []byte) error {
	c.logger.Debug("Performance update event received")
	return nil
}
