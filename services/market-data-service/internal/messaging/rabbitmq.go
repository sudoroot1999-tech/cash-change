package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"go.uber.org/zap"
)

// RabbitMQClient handles RabbitMQ connections
type RabbitMQClient struct {
	conn       *amqp.Connection
	channel    *amqp.Channel
	url        string
	logger     *zap.Logger
	mu         sync.RWMutex
	reconnecting bool
}

// NewRabbitMQClient creates a new RabbitMQ client
func NewRabbitMQClient(url string, logger *zap.Logger) (*RabbitMQClient, error) {
	client := &RabbitMQClient{
		url:    url,
		logger: logger,
	}

	if err := client.connect(); err != nil {
		return nil, err
	}

	// Setup exchanges and queues
	if err := client.setupTopology(); err != nil {
		return nil, err
	}

	// Start reconnection handler
	go client.handleReconnect()

	return client, nil
}

func (c *RabbitMQClient) connect() error {
	var err error
	c.conn, err = amqp.Dial(c.url)
	if err != nil {
		return fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	c.channel, err = c.conn.Channel()
	if err != nil {
		return fmt.Errorf("failed to open channel: %w", err)
	}

	c.logger.Info("✅ Connected to RabbitMQ")
	return nil
}


func (c *RabbitMQClient) setupTopology() error {
	// Declare exchanges
	exchanges := []string{
		ExchangeMarketDataEvents,
		ExchangeTradingEvents,
		ExchangeMatchingEngineEvents,
		ExchangeDLX,
	}

	for _, exchange := range exchanges {
		if err := c.channel.ExchangeDeclare(
			exchange,
			"topic",
			true,  // durable
			false, // auto-deleted
			false, // internal
			false, // no-wait
			nil,
		); err != nil {
			return fmt.Errorf("failed to declare exchange %s: %w", exchange, err)
		}
	}

	// Declare queues with DLX
	queues := []string{
		QueueMarketDataTicker,
		QueueMarketDataOrderbook,
		QueueMarketDataKline,
		QueueMarketDataTrade,
		QueueMatchingOrderbookUpdate,
	}

	args := amqp.Table{
		"x-dead-letter-exchange": ExchangeDLX,
	}

	for _, queue := range queues {
		if _, err := c.channel.QueueDeclare(
			queue,
			true,  // durable
			false, // delete when unused
			false, // exclusive
			false, // no-wait
			args,
		); err != nil {
			return fmt.Errorf("failed to declare queue %s: %w", queue, err)
		}
	}

	// Bind queues to exchanges
	bindings := []struct {
		queue      string
		routingKey string
		exchange   string
	}{
		{QueueMarketDataTicker, RoutingKeyTickerUpdated, ExchangeMarketDataEvents},
		{QueueMarketDataOrderbook, RoutingKeyOrderbookUpdated, ExchangeMarketDataEvents},
		{QueueMatchingOrderbookUpdate, RoutingKeyMatchingOrderbook, ExchangeMatchingEngineEvents},
	}

	for _, b := range bindings {
		if err := c.channel.QueueBind(b.queue, b.routingKey, b.exchange, false, nil); err != nil {
			return fmt.Errorf("failed to bind queue %s: %w", b.queue, err)
		}
	}

	c.logger.Info("✅ RabbitMQ topology setup complete")
	return nil
}


func (c *RabbitMQClient) handleReconnect() {
	for {
		reason, ok := <-c.conn.NotifyClose(make(chan *amqp.Error))
		if !ok {
			c.logger.Info("RabbitMQ connection closed normally")
			return
		}

		c.logger.Warn("RabbitMQ connection lost", zap.Error(reason))
		c.mu.Lock()
		c.reconnecting = true
		c.mu.Unlock()

		for {
			time.Sleep(5 * time.Second)
			if err := c.connect(); err != nil {
				c.logger.Error("Failed to reconnect to RabbitMQ", zap.Error(err))
				continue
			}
			if err := c.setupTopology(); err != nil {
				c.logger.Error("Failed to setup topology", zap.Error(err))
				continue
			}
			c.mu.Lock()
			c.reconnecting = false
			c.mu.Unlock()
			c.logger.Info("✅ Reconnected to RabbitMQ")
			break
		}
	}
}

// Publish publishes a message to an exchange
func (c *RabbitMQClient) Publish(ctx context.Context, exchange, routingKey string, message interface{}) error {
	c.mu.RLock()
	if c.reconnecting {
		c.mu.RUnlock()
		return fmt.Errorf("RabbitMQ is reconnecting")
	}
	c.mu.RUnlock()

	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return c.channel.PublishWithContext(ctx,
		exchange,
		routingKey,
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Timestamp:    time.Now(),
			Body:         data,
		},
	)
}

// Subscribe subscribes to a queue
func (c *RabbitMQClient) Subscribe(queue string, handler func([]byte) error) error {
	msgs, err := c.channel.Consume(
		queue,
		"",    // consumer
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to consume from queue %s: %w", queue, err)
	}

	go func() {
		for msg := range msgs {
			if err := handler(msg.Body); err != nil {
				c.logger.Error("Failed to handle message", zap.Error(err))
				msg.Nack(false, true) // requeue
			} else {
				msg.Ack(false)
			}
		}
	}()

	return nil
}

// Close closes the RabbitMQ connection
func (c *RabbitMQClient) Close() error {
	if c.channel != nil {
		c.channel.Close()
	}
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

// IsHealthy checks if RabbitMQ is healthy
func (c *RabbitMQClient) IsHealthy() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return !c.reconnecting && c.conn != nil && !c.conn.IsClosed()
}
