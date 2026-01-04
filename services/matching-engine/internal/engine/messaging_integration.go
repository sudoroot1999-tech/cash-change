package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/trading-platform/matching-engine/internal/events"
	"github.com/trading-platform/matching-engine/internal/messaging"
	"github.com/trading-platform/matching-engine/internal/types"
)

// MessagingIntegration handles messaging for the matching engine
type MessagingIntegration struct {
	rabbitmq      *messaging.RabbitMQClient
	kafkaProducer *messaging.KafkaProducer
	kafkaConsumer *messaging.KafkaConsumer
	engine        *MatchingEngine
	logger        *log.Logger
}

// NewMessagingIntegration creates a new messaging integration
func NewMessagingIntegration(
	rabbitmqURL string,
	kafkaBrokers []string,
	engine *MatchingEngine,
	logger *log.Logger,
) (*MessagingIntegration, error) {
	// Initialize RabbitMQ
	rabbitmq, err := messaging.NewRabbitMQClient(rabbitmqURL, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create RabbitMQ client: %w", err)
	}

	// Initialize Kafka Producer
	kafkaProducer, err := messaging.NewKafkaProducer(kafkaBrokers, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kafka producer: %w", err)
	}

	integration := &MessagingIntegration{
		rabbitmq:      rabbitmq,
		kafkaProducer: kafkaProducer,
		engine:        engine,
		logger:        logger,
	}

	// Setup queue bindings
	if err := integration.setupBindings(); err != nil {
		return nil, fmt.Errorf("failed to setup bindings: %w", err)
	}

	return integration, nil
}

// setupBindings configures RabbitMQ queue bindings
func (m *MessagingIntegration) setupBindings() error {
	// Bind order processing queue to trading exchange
	return m.rabbitmq.BindQueue(
		messaging.QueueMatchingOrderProcess,
		messaging.ExchangeTradingEvents,
		messaging.RoutingKeyOrderPlaced,
	)
}

// StartConsumers starts consuming messages from queues
func (m *MessagingIntegration) StartConsumers(ctx context.Context) error {
	// Consume orders from RabbitMQ (high priority)
	if err := m.rabbitmq.Consume(
		messaging.QueueMatchingOrderProcess,
		m.handleOrderPlaced,
	); err != nil {
		return fmt.Errorf("failed to start RabbitMQ consumer: %w", err)
	}

	m.logger.Println("✅ Messaging consumers started")
	return nil
}

// handleOrderPlaced handles incoming order placement messages
func (m *MessagingIntegration) handleOrderPlaced(data []byte) error {
	var orderEvent events.OrderPlacedEvent
	if err := json.Unmarshal(data, &orderEvent); err != nil {
		return fmt.Errorf("failed to unmarshal order: %w", err)
	}

	m.logger.Printf("📥 Received order: %s for pair %s", orderEvent.OrderID, orderEvent.Pair)

	// Convert to internal order type
	order := m.convertToInternalOrder(orderEvent)

	// Submit to matching engine
	m.engine.SubmitOrder(order)

	// Publish order received event
	if err := m.PublishOrderReceived(order); err != nil {
		m.logger.Printf("Failed to publish order received event: %v", err)
	}

	return nil
}

// PublishOrderReceived publishes an order received event
func (m *MessagingIntegration) PublishOrderReceived(order *types.Order) error {
	ctx := context.Background()

	event := events.NewOrderReceivedEvent(
		order.ID,
		order.UserID,
		order.TradingPair,
		string(order.Side),
		string(order.Type),
		order.Price.String(),
		order.Quantity.String(),
	)

	// Publish to RabbitMQ
	if err := m.rabbitmq.Publish(
		ctx,
		messaging.ExchangeMatchingEngineEvents,
		messaging.RoutingKeyMatchingOrderReceived,
		event,
	); err != nil {
		return err
	}

	// Publish to Kafka for audit
	return m.kafkaProducer.ProduceMatchingEngineEvent(ctx, event, order.ID.String())
}

// PublishOrderMatch publishes an order match event
func (m *MessagingIntegration) PublishOrderMatch(buyOrder, sellOrder *types.Order, matchedQuantity string) error {
	ctx := context.Background()

	event := events.NewOrderMatchEvent(
		buyOrder.ID,
		sellOrder.ID,
		buyOrder.UserID,
		sellOrder.UserID,
		buyOrder.TradingPair,
		buyOrder.Price.String(),
		matchedQuantity,
	)

	// Publish to RabbitMQ for immediate processing
	if err := m.rabbitmq.PublishWithPriority(
		ctx,
		messaging.ExchangeMatchingEngineEvents,
		messaging.RoutingKeyMatchingOrderMatch,
		event,
		10, // High priority
	); err != nil {
		return err
	}

	// Publish to Kafka for analytics
	return m.kafkaProducer.ProduceMatchingEngineEvent(ctx, event, buyOrder.TradingPair)
}

// PublishTradeExecuted publishes a trade executed event
func (m *MessagingIntegration) PublishTradeExecuted(trade *types.Trade) error {
	ctx := context.Background()

	event := events.NewTradeExecutedEvent(
		trade.ID,
		trade.BuyOrderID,
		trade.SellOrderID,
		trade.BuyUserID,
		trade.SellUserID,
		trade.TradingPair,
		trade.Price.String(),
		trade.Quantity.String(),
		trade.BuyerFee.String(),
		trade.SellerFee.String(),
		trade.IsMaker,
		!trade.IsMaker,
	)

	// Publish to RabbitMQ for wallet updates
	if err := m.rabbitmq.Publish(
		ctx,
		messaging.ExchangeTradingEvents,
		messaging.RoutingKeyTradeExecuted,
		event,
	); err != nil {
		return err
	}

	// Publish to Kafka for analytics and audit
	return m.kafkaProducer.ProduceTradeEvent(ctx, event, trade.ID.String())
}

// PublishOrderbookUpdate publishes orderbook updates
func (m *MessagingIntegration) PublishOrderbookUpdate(orderbook *types.OrderBook) error {
	ctx := context.Background()

	event := &events.OrderBookUpdatedEvent{
		BaseEvent:    events.NewBaseEvent(),
		Pair:         orderbook.TradingPair,
		LastUpdateID: 0, // TODO: implement update ID tracking
	}

	// Convert bids and asks
	event.Bids = make([][2]string, len(orderbook.Bids))
	for i, bid := range orderbook.Bids {
		event.Bids[i] = [2]string{bid.Price.String(), bid.Quantity.String()}
	}

	event.Asks = make([][2]string, len(orderbook.Asks))
	for i, ask := range orderbook.Asks {
		event.Asks[i] = [2]string{ask.Price.String(), ask.Quantity.String()}
	}

	// Publish to Kafka for real-time market data
	return m.kafkaProducer.ProduceMarketData(
		ctx,
		messaging.TopicMarketDataOrderbook,
		event,
		orderbook.TradingPair,
	)
}

// PublishHealthMetrics publishes health metrics
func (m *MessagingIntegration) PublishHealthMetrics(
	status string,
	queueDepth int,
	matchesPerSecond float64,
	latencyMs float64,
	instanceID string,
) error {
	ctx := context.Background()

	event := &events.MatchingEngineHealthEvent{
		BaseEvent:        events.NewBaseEvent(),
		InstanceID:       instanceID,
		Status:           status,
		QueueDepth:       queueDepth,
		MatchesPerSecond: matchesPerSecond,
		LatencyMs:        latencyMs,
	}

	// Publish to Kafka for monitoring
	return m.kafkaProducer.ProduceSystemMetrics(ctx, event)
}

// PublishCircuitBreaker publishes circuit breaker event
func (m *MessagingIntegration) PublishCircuitBreaker(
	pair string,
	reason string,
	previousPrice string,
	currentPrice string,
	priceChangePercentage float64,
) error {
	ctx := context.Background()

	event := &events.CircuitBreakerTriggeredEvent{
		BaseEvent:             events.NewBaseEvent(),
		Pair:                  pair,
		Reason:                reason,
		PreviousPrice:         previousPrice,
		CurrentPrice:          currentPrice,
		PriceChangePercentage: priceChangePercentage,
	}

	// Publish to RabbitMQ for immediate notification
	return m.rabbitmq.PublishWithPriority(
		ctx,
		messaging.ExchangeMatchingEngineEvents,
		messaging.RoutingKeyCircuitBreakerTriggered,
		event,
		10, // Critical priority
	)
}

// Helper to convert OrderPlacedEvent to internal Order type
func (m *MessagingIntegration) convertToInternalOrder(event events.OrderPlacedEvent) *types.Order {
	// This is a simplified conversion - adjust based on your actual Order struct
	order := &types.Order{
		ID:          event.OrderID,
		UserID:      event.UserID,
		TradingPair: event.Pair,
	}

	// Convert side
	if event.Side == "buy" {
		order.Side = types.OrderSideBuy
	} else {
		order.Side = types.OrderSideSell
	}

	// Convert type
	switch event.Type {
	case "market":
		order.Type = types.OrderTypeMarket
	case "limit":
		order.Type = types.OrderTypeLimit
	case "stop-loss":
		order.Type = types.OrderTypeStopLoss
	case "stop-limit":
		order.Type = types.OrderTypeStopLimit
	}

	return order
}

// Close closes all messaging connections
func (m *MessagingIntegration) Close() error {
	if err := m.rabbitmq.Close(); err != nil {
		m.logger.Printf("Error closing RabbitMQ: %v", err)
	}
	if err := m.kafkaProducer.Close(); err != nil {
		m.logger.Printf("Error closing Kafka producer: %v", err)
	}
	if m.kafkaConsumer != nil {
		if err := m.kafkaConsumer.Close(); err != nil {
			m.logger.Printf("Error closing Kafka consumer: %v", err)
		}
	}
	return nil
}

// IsHealthy checks if messaging is healthy
func (m *MessagingIntegration) IsHealthy() bool {
	return m.rabbitmq.IsConnected() && m.kafkaProducer.IsHealthy()
}
