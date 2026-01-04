package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// RabbitMQClient handles RabbitMQ connections
type RabbitMQClient struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	url     string
	logger  *log.Logger
}

// NewRabbitMQClient creates a new RabbitMQ client
func NewRabbitMQClient(url string, logger *log.Logger) (*RabbitMQClient, error) {
	client := &RabbitMQClient{
		url:    url,
		logger: logger,
	}

	if err := client.connect(); err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	return client, nil
}

// connect establishes connection to RabbitMQ
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

	// Set QoS for prefetch
	if err := ch.Qos(100, 0, false); err != nil {
		return err
	}

	// Setup infrastructure
	if err := r.setupInfrastructure(); err != nil {
		return err
	}

	r.logger.Println("✅ Connected to RabbitMQ")
	return nil
}

// setupInfrastructure creates exchanges and queues
func (r *RabbitMQClient) setupInfrastructure() error {
	// Declare exchanges
	exchanges := []string{
		ExchangeTradingEvents,
		ExchangeMatchingEngineEvents,
		ExchangeMarketDataEvents,
		ExchangeWalletEvents,
		ExchangeDLX,
	}

	for _, exchange := range exchanges {
		if err := r.channel.ExchangeDeclare(
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

	// Declare queues
	queues := map[string]amqp.Table{
		QueueMatchingOrderProcess: {
			"x-dead-letter-exchange": ExchangeDLX,
			"x-message-ttl":          86400000, // 24 hours
			"x-max-priority":         10,
		},
		QueueMatchingOrderReceived: {
			"x-dead-letter-exchange": ExchangeDLX,
			"x-message-ttl":          86400000,
		},
		QueueDLXQueue: nil,
	}

	for queue, args := range queues {
		if _, err := r.channel.QueueDeclare(
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

	// Bind DLX queue
	if err := r.channel.QueueBind(
		QueueDLXQueue,
		"#",
		ExchangeDLX,
		false,
		nil,
	); err != nil {
		return err
	}

	r.logger.Println("✅ RabbitMQ infrastructure setup completed")
	return nil
}

// Publish publishes a message to an exchange
func (r *RabbitMQClient) Publish(ctx context.Context, exchange, routingKey string, message interface{}) error {
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return r.channel.PublishWithContext(
		ctx,
		exchange,
		routingKey,
		false, // mandatory
		false, // immediate
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

	return r.channel.PublishWithContext(
		ctx,
		exchange,
		routingKey,
		false,
		false,
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
	msgs, err := r.channel.Consume(
		queue,
		"",    // consumer tag
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,
	)
	if err != nil {
		return err
	}

	go func() {
		for msg := range msgs {
			if err := handler(msg.Body); err != nil {
				r.logger.Printf("Error handling message: %v", err)
				
				// Retry logic
				retryCount := getRetryCount(msg.Headers)
				if retryCount < 3 {
					// Nack and requeue with incremented retry count
					msg.Nack(false, false)
					
					// Publish back to queue with retry count
					headers := amqp.Table{
						"x-retry-count": retryCount + 1,
					}
					r.channel.Publish(
						"",
						queue,
						false,
						false,
						amqp.Publishing{
							ContentType:  msg.ContentType,
							Body:         msg.Body,
							DeliveryMode: msg.DeliveryMode,
							Headers:      headers,
						},
					)
				} else {
					// Send to DLQ after 3 retries
					msg.Nack(false, false)
					r.logger.Printf("Message sent to DLQ after 3 retries")
				}
			} else {
				msg.Ack(false)
			}
		}
	}()

	r.logger.Printf("✅ Started consuming from queue: %s", queue)
	return nil
}

// BindQueue binds a queue to an exchange with a routing key
func (r *RabbitMQClient) BindQueue(queue, exchange, routingKey string) error {
	return r.channel.QueueBind(
		queue,
		routingKey,
		exchange,
		false,
		nil,
	)
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

// IsConnected checks if the connection is active
func (r *RabbitMQClient) IsConnected() bool {
	return r.conn != nil && !r.conn.IsClosed()
}

// Helper function to get retry count from headers
func getRetryCount(headers amqp.Table) int {
	if headers == nil {
		return 0
	}
	if count, ok := headers["x-retry-count"].(int); ok {
		return count
	}
	return 0
}
