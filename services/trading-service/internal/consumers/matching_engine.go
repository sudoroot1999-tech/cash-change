package consumers

import (
	"context"
	"encoding/json"

	"github.com/trading-platform/trading-service/internal/cache"
	"github.com/trading-platform/trading-service/internal/jobs"
	"github.com/trading-platform/trading-service/internal/messaging"
	"github.com/trading-platform/trading-service/internal/repository"
	"github.com/trading-platform/trading-service/internal/types"
	"go.uber.org/zap"
)

// MatchingEngineConsumer consumes events from matching engine
type MatchingEngineConsumer struct {
	rabbitmq     *messaging.RabbitMQClient
	kafka        *messaging.KafkaConsumer
	repo         *repository.PostgresRepository
	cache        *cache.MultiLayerCache
	tradeWorker  *jobs.WorkerPool
	positionWorker *jobs.WorkerPool
	logger       *zap.Logger
}

// NewMatchingEngineConsumer creates a new matching engine consumer
func NewMatchingEngineConsumer(
	rabbitmq *messaging.RabbitMQClient,
	kafka *messaging.KafkaConsumer,
	repo *repository.PostgresRepository,
	cache *cache.MultiLayerCache,
	tradeWorker *jobs.WorkerPool,
	positionWorker *jobs.WorkerPool,
	logger *zap.Logger,
) *MatchingEngineConsumer {
	return &MatchingEngineConsumer{
		rabbitmq:       rabbitmq,
		kafka:          kafka,
		repo:           repo,
		cache:          cache,
		tradeWorker:    tradeWorker,
		positionWorker: positionWorker,
		logger:         logger,
	}
}

// Start starts consuming matching engine events
func (c *MatchingEngineConsumer) Start(ctx context.Context) error {
	// Consume from RabbitMQ for trade results
	if err := c.rabbitmq.Consume(messaging.QueueMatchingTradeResult, c.handleTradeResult); err != nil {
		return err
	}

	// Consume from Kafka for order updates
	if err := c.kafka.Subscribe(ctx, messaging.TopicMatchingEngineEvents, c.handleMatchingEvent); err != nil {
		return err
	}

	c.logger.Info("✅ Matching engine consumer started")
	return nil
}

// handleTradeResult handles trade results from matching engine
func (c *MatchingEngineConsumer) handleTradeResult(data []byte) error {
	var trade types.Trade
	if err := json.Unmarshal(data, &trade); err != nil {
		c.logger.Error("Failed to unmarshal trade", zap.Error(err))
		return err
	}

	c.logger.Info("Received trade result",
		zap.String("trade_id", trade.ID.String()),
		zap.String("trading_pair", trade.TradingPair),
	)

	// Submit to trade worker for settlement
	c.tradeWorker.Submit(&jobs.Job{
		ID:      trade.ID.String(),
		Type:    jobs.JobTypeTradeSettle,
		Payload: &trade,
	})

	return nil
}

// handleMatchingEvent handles events from Kafka
func (c *MatchingEngineConsumer) handleMatchingEvent(data []byte) error {
	var event struct {
		Type    string          `json:"type"`
		Payload json.RawMessage `json:"payload"`
	}

	if err := json.Unmarshal(data, &event); err != nil {
		return err
	}

	switch event.Type {
	case "ORDER_MATCHED":
		return c.handleOrderMatched(event.Payload)
	case "ORDER_FILLED":
		return c.handleOrderFilled(event.Payload)
	case "ORDER_REJECTED":
		return c.handleOrderRejected(event.Payload)
	case "POSITION_UPDATED":
		return c.handlePositionUpdated(event.Payload)
	case "LIQUIDATION":
		return c.handleLiquidation(event.Payload)
	}

	return nil
}

func (c *MatchingEngineConsumer) handleOrderMatched(data []byte) error {
	var order types.Order
	if err := json.Unmarshal(data, &order); err != nil {
		return err
	}

	order.Status = types.OrderStatusPartiallyFilled
	return c.repo.UpdateOrder(context.Background(), &order)
}

func (c *MatchingEngineConsumer) handleOrderFilled(data []byte) error {
	var order types.Order
	if err := json.Unmarshal(data, &order); err != nil {
		return err
	}

	order.Status = types.OrderStatusFilled
	return c.repo.UpdateOrder(context.Background(), &order)
}

func (c *MatchingEngineConsumer) handleOrderRejected(data []byte) error {
	var order types.Order
	if err := json.Unmarshal(data, &order); err != nil {
		return err
	}

	order.Status = types.OrderStatusRejected
	return c.repo.UpdateOrder(context.Background(), &order)
}

func (c *MatchingEngineConsumer) handlePositionUpdated(data []byte) error {
	var position types.Position
	if err := json.Unmarshal(data, &position); err != nil {
		return err
	}

	// Submit to position worker
	c.positionWorker.Submit(&jobs.Job{
		ID:      position.ID.String(),
		Type:    jobs.JobTypePositionUpdate,
		Payload: &position,
	})

	return nil
}

func (c *MatchingEngineConsumer) handleLiquidation(data []byte) error {
	var liquidation types.Liquidation
	if err := json.Unmarshal(data, &liquidation); err != nil {
		return err
	}

	// Submit to position worker
	c.positionWorker.Submit(&jobs.Job{
		ID:      liquidation.ID.String(),
		Type:    jobs.JobTypeLiquidation,
		Payload: &liquidation,
	})

	return nil
}
