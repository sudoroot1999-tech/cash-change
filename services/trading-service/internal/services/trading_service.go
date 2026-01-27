package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/trading-platform/trading-service/internal/cache"
	"github.com/trading-platform/trading-service/internal/jobs"
	"github.com/trading-platform/trading-service/internal/messaging"
	"github.com/trading-platform/trading-service/internal/repository"
	"github.com/trading-platform/trading-service/internal/types"
	"go.uber.org/zap"
)

// TradingService handles trading operations
type TradingService struct {
	repo           *repository.PostgresRepository
	cache          *cache.MultiLayerCache
	rabbitmq       *messaging.RabbitMQClient
	kafka          *messaging.KafkaProducer
	orderWorker    *jobs.WorkerPool
	tradeWorker    *jobs.WorkerPool
	positionWorker *jobs.WorkerPool
	logger         *zap.Logger
}

// NewTradingService creates a new trading service
func NewTradingService(
	repo *repository.PostgresRepository,
	cache *cache.MultiLayerCache,
	rabbitmq *messaging.RabbitMQClient,
	kafka *messaging.KafkaProducer,
	orderWorkers, tradeWorkers, positionWorkers int,
	logger *zap.Logger,
) *TradingService {
	svc := &TradingService{
		repo:     repo,
		cache:    cache,
		rabbitmq: rabbitmq,
		kafka:    kafka,
		logger:   logger,
	}

	// Initialize worker pools
	svc.orderWorker = jobs.NewWorkerPool("order-worker", orderWorkers, 10000, logger)
	svc.tradeWorker = jobs.NewWorkerPool("trade-worker", tradeWorkers, 5000, logger)
	svc.positionWorker = jobs.NewWorkerPool("position-worker", positionWorkers, 1000, logger)

	// Register job handlers
	svc.registerJobHandlers()

	return svc
}

func (s *TradingService) registerJobHandlers() {
	s.orderWorker.RegisterHandler(jobs.JobTypeOrderProcess, s.handleOrderProcess)
	s.orderWorker.RegisterHandler(jobs.JobTypeOrderCancel, s.handleOrderCancel)
	s.tradeWorker.RegisterHandler(jobs.JobTypeTradeSettle, s.handleTradeSettle)
	s.positionWorker.RegisterHandler(jobs.JobTypePositionUpdate, s.handlePositionUpdate)
	s.positionWorker.RegisterHandler(jobs.JobTypeLiquidation, s.handleLiquidation)
}

// Start starts the trading service
func (s *TradingService) Start(ctx context.Context) {
	s.orderWorker.Start()
	s.tradeWorker.Start()
	s.positionWorker.Start()
	s.logger.Info("✅ Trading service started")
}

// Stop stops the trading service
func (s *TradingService) Stop() {
	s.orderWorker.Stop()
	s.tradeWorker.Stop()
	s.positionWorker.Stop()
	s.logger.Info("Trading service stopped")
}

// CreateOrder creates a new order
func (s *TradingService) CreateOrder(ctx context.Context, req *CreateOrderRequest) (*types.Order, error) {
	// Validate trading pair
	pair, err := s.repo.GetTradingPair(ctx, req.TradingPair)
	if err != nil {
		return nil, fmt.Errorf("invalid trading pair: %w", err)
	}

	quantity, _ := decimal.NewFromString(req.Quantity)
	if quantity.LessThan(pair.MinOrderSize) || quantity.GreaterThan(pair.MaxOrderSize) {
		return nil, fmt.Errorf("order size out of allowed range")
	}

	// Create order
	order := &types.Order{
		ID:                uuid.New(),
		UserID:            req.UserID,
		TradingPair:       req.TradingPair,
		Type:              types.OrderType(req.Type),
		Side:              types.OrderSide(req.Side),
		Quantity:          quantity,
		RemainingQuantity: quantity,
		FilledQuantity:    decimal.Zero,
		Status:            types.OrderStatusPending,
		TimeInForce:       types.TimeInForce(req.TimeInForce),
		TradingType:       types.TradingType(req.TradingType),
		MakerFee:          pair.MakerFee,
		TakerFee:          pair.TakerFee,
		ReduceOnly:        req.ReduceOnly,
		PostOnly:          req.PostOnly,
		ClientOrderID:     req.ClientOrderID,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if req.Price != "" {
		order.Price, _ = decimal.NewFromString(req.Price)
	}
	if req.StopPrice != "" {
		order.StopPrice, _ = decimal.NewFromString(req.StopPrice)
	}
	if req.Leverage != "" {
		order.Leverage, _ = decimal.NewFromString(req.Leverage)
	}
	if req.MarginMode != "" {
		order.MarginMode = types.MarginMode(req.MarginMode)
	}

	// Save order to database
	if err := s.repo.CreateOrder(ctx, order); err != nil {
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	// Submit to order worker for async processing
	s.orderWorker.Submit(&jobs.Job{
		ID:      order.ID.String(),
		Type:    jobs.JobTypeOrderProcess,
		Payload: order,
	})

	// Publish order created event (async via RabbitMQ)
	go s.publishOrderEvent(ctx, order, messaging.RoutingKeyOrderCreated)

	return order, nil
}

// CancelOrder cancels an order
func (s *TradingService) CancelOrder(ctx context.Context, orderID uuid.UUID) error {
	order, err := s.repo.GetOrder(ctx, orderID)
	if err != nil {
		return fmt.Errorf("order not found: %w", err)
	}

	if order.Status == types.OrderStatusFilled || order.Status == types.OrderStatusCancelled {
		return fmt.Errorf("cannot cancel order in current status")
	}

	// Submit to order worker
	s.orderWorker.Submit(&jobs.Job{
		ID:      orderID.String(),
		Type:    jobs.JobTypeOrderCancel,
		Payload: order,
	})

	return nil
}

// GetOpenOrders retrieves open orders for a user
func (s *TradingService) GetOpenOrders(ctx context.Context, userID uuid.UUID, tradingPair string) ([]*types.Order, error) {
	return s.repo.GetOpenOrders(ctx, userID, tradingPair)
}

// GetTicker retrieves ticker data with caching
func (s *TradingService) GetTicker(ctx context.Context, tradingPair string) (*types.Ticker, error) {
	// Try cache first
	data, err := s.cache.GetTicker(ctx, tradingPair)
	if err == nil {
		var ticker types.Ticker
		if json.Unmarshal(data, &ticker) == nil {
			return &ticker, nil
		}
	}

	// Return empty ticker - data comes from market-data service via async events
	return &types.Ticker{TradingPair: tradingPair, Timestamp: time.Now()}, nil
}

// GetOrderBook retrieves order book with caching
// Order book data is populated via async messaging from matching engine
func (s *TradingService) GetOrderBook(ctx context.Context, tradingPair string, depth int) (*types.OrderBook, error) {
	// Try cache first - order book is populated by matching engine consumer
	data, err := s.cache.GetOrderBook(ctx, tradingPair)
	if err == nil {
		var orderBook types.OrderBook
		if json.Unmarshal(data, &orderBook) == nil {
			return &orderBook, nil
		}
	}

	// Return empty order book if not in cache
	// Data will be populated when matching engine sends ORDER_BOOK_UPDATE events
	return &types.OrderBook{TradingPair: tradingPair, Timestamp: time.Now()}, nil
}

// GetPosition retrieves a position with caching
func (s *TradingService) GetPosition(ctx context.Context, userID uuid.UUID, tradingPair string) (*types.Position, error) {
	// Try cache first
	data, err := s.cache.GetPosition(ctx, userID.String(), tradingPair)
	if err == nil {
		var position types.Position
		if json.Unmarshal(data, &position) == nil {
			return &position, nil
		}
	}

	// Fetch from database
	position, err := s.repo.GetPosition(ctx, userID, tradingPair)
	if err != nil {
		return nil, err
	}

	// Cache the result
	if data, err := json.Marshal(position); err == nil {
		s.cache.SetPosition(ctx, userID.String(), tradingPair, data, 10*time.Second)
	}

	return position, nil
}

// GetUserPositions retrieves all positions for a user
func (s *TradingService) GetUserPositions(ctx context.Context, userID uuid.UUID) ([]*types.Position, error) {
	return s.repo.GetUserPositions(ctx, userID)
}

// Job handlers
func (s *TradingService) handleOrderProcess(ctx context.Context, job *jobs.Job) error {
	order := job.Payload.(*types.Order)

	// Send to matching engine via RabbitMQ (async)
	// Orders are sent to the matching engine exchange for processing
	if err := s.rabbitmq.PublishWithPriority(ctx, messaging.ExchangeMatchingEngineEvents,
		messaging.RoutingKeyOrderCreated, order, 8); err != nil {
		return err
	}

	// Also publish to Kafka for event sourcing
	return s.kafka.PublishOrderEvent(ctx, order)
}

func (s *TradingService) handleOrderCancel(ctx context.Context, job *jobs.Job) error {
	order := job.Payload.(*types.Order)

	order.Status = types.OrderStatusCancelled
	order.UpdatedAt = time.Now()

	if err := s.repo.UpdateOrder(ctx, order); err != nil {
		return err
	}

	// Publish cancellation event
	return s.rabbitmq.Publish(ctx, messaging.ExchangeTradingEvents,
		messaging.RoutingKeyOrderCancelled, order)
}

func (s *TradingService) handleTradeSettle(ctx context.Context, job *jobs.Job) error {
	trade := job.Payload.(*types.Trade)

	// Save trade
	if err := s.repo.CreateTrade(ctx, trade); err != nil {
		return err
	}

	// Publish to wallet service for settlement
	return s.rabbitmq.Publish(ctx, messaging.ExchangeWalletEvents,
		messaging.RoutingKeyTradeSettled, trade)
}

func (s *TradingService) handlePositionUpdate(ctx context.Context, job *jobs.Job) error {
	position := job.Payload.(*types.Position)

	if err := s.repo.UpdatePosition(ctx, position); err != nil {
		return err
	}

	// Invalidate cache
	s.cache.InvalidatePosition(ctx, position.UserID.String(), position.TradingPair)

	// Publish position update
	return s.kafka.PublishPositionEvent(ctx, position)
}

func (s *TradingService) handleLiquidation(ctx context.Context, job *jobs.Job) error {
	liquidation := job.Payload.(*types.Liquidation)

	// Publish liquidation event
	return s.rabbitmq.Publish(ctx, messaging.ExchangeTradingEvents,
		messaging.RoutingKeyLiquidation, liquidation)
}

func (s *TradingService) publishOrderEvent(ctx context.Context, order *types.Order, routingKey string) {
	if err := s.rabbitmq.Publish(ctx, messaging.ExchangeTradingEvents, routingKey, order); err != nil {
		s.logger.Error("Failed to publish order event", zap.Error(err))
	}
}

// CreateOrderRequest represents a request to create an order
type CreateOrderRequest struct {
	UserID        uuid.UUID `json:"userId"`
	TradingPair   string    `json:"tradingPair"`
	Type          string    `json:"type"`
	Side          string    `json:"side"`
	Price         string    `json:"price,omitempty"`
	Quantity      string    `json:"quantity"`
	StopPrice     string    `json:"stopPrice,omitempty"`
	TimeInForce   string    `json:"timeInForce"`
	TradingType   string    `json:"tradingType"`
	MarginMode    string    `json:"marginMode,omitempty"`
	Leverage      string    `json:"leverage,omitempty"`
	ReduceOnly    bool      `json:"reduceOnly"`
	PostOnly      bool      `json:"postOnly"`
	ClientOrderID string    `json:"clientOrderId,omitempty"`
}
