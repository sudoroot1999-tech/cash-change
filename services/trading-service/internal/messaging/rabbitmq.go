package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"go.uber.org/zap"
)

// RabbitMQClient handles RabbitMQ connections
type RabbitMQClient struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	url     string
	logger  *zap.Logger
}

// NewRabbitMQClient creates a new RabbitMQ client
func NewRabbitMQClient(url string, logger *zap.Logger) (*RabbitMQClient, error) {
	client := &RabbitMQClient{
		url:    url,
		logger: logger,
	}

	if err := client.connect(); err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	return client, nil
}

func (r *RabbitMQClient) connect() error {
	conn, err := amqp.Dial(r.url)
	if err != nil {
		return err
	}
	r.conn = conn

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return err
	}
	r.channel = ch

	if err := ch.Qos(100, 0, false); err != nil {
		return err
	}

	if err := r.setupInfrastructure(); err != nil {
		return err
	}

	r.logger.Info("✅ Connected to RabbitMQ")
	return nil
}

func (r *RabbitMQClient) setupInfrastructure() error {
	// Declare exchanges
	exchanges := []string{
		ExchangeTradingEvents,
		ExchangeMatchingEngineEvents,
		ExchangeMarketDataEvents,
		ExchangeWalletEvents,
		ExchangeSocialTradingEvents,
		ExchangeNotificationEvents,
		ExchangeDLX,
	}

	for _, exchange := range exchanges {
		if err := r.channel.ExchangeDeclare(
			exchange, "topic", true, false, false, false, nil,
		); err != nil {
			return fmt.Errorf("failed to declare exchange %s: %w", exchange, err)
		}
	}

	// Declare queues with DLX
	queues := map[string]amqp.Table{
		QueueTradingOrderCreate:   {"x-dead-letter-exchange": ExchangeDLX, "x-message-ttl": int32(86400000), "x-max-priority": int32(10)},
		QueueTradingOrderCancel:   {"x-dead-letter-exchange": ExchangeDLX, "x-message-ttl": int32(86400000)},
		QueueTradingOrderUpdate:   {"x-dead-letter-exchange": ExchangeDLX, "x-message-ttl": int32(86400000)},
		QueueTradingTradeExecuted: {"x-dead-letter-exchange": ExchangeDLX, "x-message-ttl": int32(86400000)},
		QueueMatchingTradeResult:  {"x-dead-letter-exchange": ExchangeDLX, "x-message-ttl": int32(86400000)},
		QueueWalletTradeSettle:    {"x-dead-letter-exchange": ExchangeDLX, "x-message-ttl": int32(86400000)},
		QueueSocialCopyTrade:      {"x-dead-letter-exchange": ExchangeDLX, "x-message-ttl": int32(86400000)},
		QueueDLXQueue:             nil,
	}

	for queue, args := range queues {
		if _, err := r.channel.QueueDeclare(queue, true, false, false, false, args); err != nil {
			return fmt.Errorf("failed to declare queue %s: %w", queue, err)
		}
	}

	// Bind queues to exchanges
	bindings := []struct {
		queue, exchange, routingKey string
	}{
		{QueueTradingOrderCreate, ExchangeTradingEvents, RoutingKeyOrderCreated},
		{QueueTradingOrderCancel, ExchangeTradingEvents, RoutingKeyOrderCancelled},
		{QueueTradingTradeExecuted, ExchangeTradingEvents, RoutingKeyTradeExecuted},
		{QueueMatchingTradeResult, ExchangeMatchingEngineEvents, "matching.trade.*"},
		{QueueWalletTradeSettle, ExchangeWalletEvents, RoutingKeyTradeSettled},
		{QueueSocialCopyTrade, ExchangeSocialTradingEvents, RoutingKeyCopyTradeCreated},
		{QueueDLXQueue, ExchangeDLX, "#"},
	}

	for _, b := range bindings {
		if err := r.channel.QueueBind(b.queue, b.routingKey, b.exchange, false, nil); err != nil {
			return fmt.Errorf("failed to bind queue %s: %w", b.queue, err)
		}
	}

	r.logger.Info("✅ RabbitMQ infrastructure setup completed")
	return nil
}

// Publish publishes a message to an exchange
func (r *RabbitMQClient) Publish(ctx context.Context, exchange, routingKey string, message interface{}) error {
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return r.channel.PublishWithContext(ctx, exchange, routingKey, false, false,
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         data,
			DeliveryMode: amqp.Persistent,
			Timestamp:    time.Now(),
			Priority:     5,
		},
	)
}

// PublishWithPriority publishes a message with custom priority
func (r *RabbitMQClient) PublishWithPriority(ctx context.Context, exchange, routingKey string, message interface{}, priority uint8) error {
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return r.channel.PublishWithContext(ctx, exchange, routingKey, false, false,
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         data,
			DeliveryMode: amqp.Persistent,
			Timestamp:    time.Now(),
			Priority:     priority,
		},
	)
}

// Consume starts consuming messages from a queue
func (r *RabbitMQClient) Consume(queue string, handler func([]byte) error) error {
	msgs, err := r.channel.Consume(queue, "", false, false, false, false, nil)
	if err != nil {
		return err
	}

	go func() {
		for msg := range msgs {
			if err := handler(msg.Body); err != nil {
				r.logger.Error("Error handling message", zap.Error(err))
				retryCount := getRetryCount(msg.Headers)
				if retryCount < 3 {
					msg.Nack(false, false)
					r.channel.Publish("", queue, false, false,
						amqp.Publishing{
							ContentType:  msg.ContentType,
							Body:         msg.Body,
							DeliveryMode: msg.DeliveryMode,
							Headers:      amqp.Table{"x-retry-count": retryCount + 1},
						},
					)
				} else {
					msg.Nack(false, false)
					r.logger.Warn("Message sent to DLQ after 3 retries")
				}
			} else {
				msg.Ack(false)
			}
		}
	}()

	r.logger.Info("✅ Started consuming from queue", zap.String("queue", queue))
	return nil
}

// Close closes the RabbitMQ connection
func (r *RabbitMQClient) Close() error {
	if r.channel != nil {
		r.channel.Close()
	}
	if r.conn != nil {
		return r.conn.Close()
	}
	return nil
}

func getRetryCount(headers amqp.Table) int {
	if headers == nil {
		return 0
	}
	if count, ok := headers["x-retry-count"].(int); ok {
		return count
	}
	return 0
}
