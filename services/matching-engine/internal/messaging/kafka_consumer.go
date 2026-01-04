package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

// MessageHandler is a function that handles incoming messages
type MessageHandler func([]byte) error

// KafkaConsumer handles Kafka message consumption
type KafkaConsumer struct {
	reader  *kafka.Reader
	handler MessageHandler
	logger  *log.Logger
}

// KafkaConsumerConfig configuration for consumer
type KafkaConsumerConfig struct {
	Brokers         []string
	GroupID         string
	Topic           string
	MinBytes        int
	MaxBytes        int
	SessionTimeout  time.Duration
	HeartbeatInterval time.Duration
	Logger          *log.Logger
}

// NewKafkaConsumer creates a new Kafka consumer
func NewKafkaConsumer(config KafkaConsumerConfig, handler MessageHandler) (*KafkaConsumer, error) {
	// Set defaults
	if config.MinBytes == 0 {
		config.MinBytes = 10e3 // 10KB
	}
	if config.MaxBytes == 0 {
		config.MaxBytes = 10e6 // 10MB
	}
	if config.SessionTimeout == 0 {
		config.SessionTimeout = 30 * time.Second
	}
	if config.HeartbeatInterval == 0 {
		config.HeartbeatInterval = 3 * time.Second
	}

	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:           config.Brokers,
		GroupID:           config.GroupID,
		Topic:             config.Topic,
		MinBytes:          config.MinBytes,
		MaxBytes:          config.MaxBytes,
		SessionTimeout:    config.SessionTimeout,
		HeartbeatInterval: config.HeartbeatInterval,
		CommitInterval:    time.Second,
		StartOffset:       kafka.LastOffset, // Start from latest
		MaxWait:           500 * time.Millisecond,
	})

	consumer := &KafkaConsumer{
		reader:  reader,
		handler: handler,
		logger:  config.Logger,
	}

	config.Logger.Printf("✅ Kafka consumer created for topic: %s, group: %s", config.Topic, config.GroupID)
	return consumer, nil
}

// Start starts consuming messages
func (c *KafkaConsumer) Start(ctx context.Context) error {
	c.logger.Println("🚀 Starting Kafka consumer...")

	for {
		select {
		case <-ctx.Done():
			c.logger.Println("⏹️  Stopping Kafka consumer...")
			return ctx.Err()
		default:
			msg, err := c.reader.FetchMessage(ctx)
			if err != nil {
				if err == context.Canceled {
					return nil
				}
				c.logger.Printf("Error fetching message: %v", err)
				continue
			}

			// Handle message
			if err := c.handleMessage(ctx, msg); err != nil {
				c.logger.Printf("Error handling message: %v", err)
				// Don't commit on error - message will be redelivered
				continue
			}

			// Commit message
			if err := c.reader.CommitMessages(ctx, msg); err != nil {
				c.logger.Printf("Error committing message: %v", err)
			}
		}
	}
}

// handleMessage processes a single message
func (c *KafkaConsumer) handleMessage(ctx context.Context, msg kafka.Message) error {
	c.logger.Printf("📥 Received message from %s [partition: %d, offset: %d]",
		msg.Topic, msg.Partition, msg.Offset)

	// Call the handler
	if err := c.handler(msg.Value); err != nil {
		return fmt.Errorf("handler error: %w", err)
	}

	return nil
}

// Close closes the consumer
func (c *KafkaConsumer) Close() error {
	c.logger.Println("✅ Closing Kafka consumer...")
	return c.reader.Close()
}

// GetStats returns consumer statistics
func (c *KafkaConsumer) GetStats() kafka.ReaderStats {
	return c.reader.Stats()
}

// Helper function to unmarshal JSON messages
func UnmarshalMessage(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}
