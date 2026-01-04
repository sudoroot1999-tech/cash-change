package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

// KafkaProducer handles Kafka message production
type KafkaProducer struct {
	writers map[string]*kafka.Writer
	logger  *log.Logger
}

// NewKafkaProducer creates a new Kafka producer
func NewKafkaProducer(brokers []string, logger *log.Logger) (*KafkaProducer, error) {
	writers := make(map[string]*kafka.Writer)

	// Create writers for all topics
	topics := []string{
		TopicTradingEvents,
		TopicMatchingEngineEvents,
		TopicOrderbookSnapshots,
		TopicMarketDataTicker,
		TopicMarketDataTrades,
		TopicMarketDataOrderbook,
		TopicAuditLogs,
		TopicSystemMetrics,
	}

	for _, topic := range topics {
		writers[topic] = &kafka.Writer{
			Addr:         kafka.TCP(brokers...),
			Topic:        topic,
			Balancer:     &kafka.LeastBytes{},
			BatchSize:    100,
			BatchTimeout: 10 * time.Millisecond,
			Compression:  kafka.Snappy,
			RequiredAcks: kafka.RequireAll, // Wait for all replicas
			Async:        false,             // Synchronous by default for reliability
		}
	}

	producer := &KafkaProducer{
		writers: writers,
		logger:  logger,
	}

	logger.Println("✅ Kafka producer initialized")
	return producer, nil
}

// Produce sends a message to a topic
func (p *KafkaProducer) Produce(ctx context.Context, topic string, key string, message interface{}) error {
	writer, ok := p.writers[topic]
	if !ok {
		return fmt.Errorf("no writer found for topic: %s", topic)
	}

	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	msg := kafka.Message{
		Key:   []byte(key),
		Value: data,
		Time:  time.Now(),
		Headers: []kafka.Header{
			{Key: "timestamp", Value: []byte(fmt.Sprint(time.Now().Unix()))},
			{Key: "producer", Value: []byte("matching-engine")},
		},
	}

	if err := writer.WriteMessages(ctx, msg); err != nil {
		p.logger.Printf("❌ Failed to produce message to %s: %v", topic, err)
		return err
	}

	p.logger.Printf("📤 Produced message to %s (key: %s)", topic, key)
	return nil
}

// ProduceBatch sends multiple messages to a topic
func (p *KafkaProducer) ProduceBatch(ctx context.Context, topic string, messages []kafka.Message) error {
	writer, ok := p.writers[topic]
	if !ok {
		return fmt.Errorf("no writer found for topic: %s", topic)
	}

	if err := writer.WriteMessages(ctx, messages...); err != nil {
		p.logger.Printf("❌ Failed to produce batch to %s: %v", topic, err)
		return err
	}

	p.logger.Printf("📤 Produced %d messages to %s", len(messages), topic)
	return nil
}

// ProduceTradeEvent publishes a trade executed event
func (p *KafkaProducer) ProduceTradeEvent(ctx context.Context, trade interface{}, tradeID string) error {
	return p.Produce(ctx, TopicTradingEvents, tradeID, trade)
}

// ProduceMatchingEngineEvent publishes a matching engine event
func (p *KafkaProducer) ProduceMatchingEngineEvent(ctx context.Context, event interface{}, key string) error {
	return p.Produce(ctx, TopicMatchingEngineEvents, key, event)
}

// ProduceOrderbookSnapshot publishes an orderbook snapshot
func (p *KafkaProducer) ProduceOrderbookSnapshot(ctx context.Context, snapshot interface{}, pair string) error {
	return p.Produce(ctx, TopicOrderbookSnapshots, pair, snapshot)
}

// ProduceMarketData publishes market data updates
func (p *KafkaProducer) ProduceMarketData(ctx context.Context, topic string, data interface{}, pair string) error {
	return p.Produce(ctx, topic, pair, data)
}

// ProduceAuditLog publishes an audit log
func (p *KafkaProducer) ProduceAuditLog(ctx context.Context, log interface{}, userID string) error {
	return p.Produce(ctx, TopicAuditLogs, userID, log)
}

// ProduceSystemMetrics publishes system metrics
func (p *KafkaProducer) ProduceSystemMetrics(ctx context.Context, metrics interface{}) error {
	return p.Produce(ctx, TopicSystemMetrics, "matching-engine", metrics)
}

// Close closes all Kafka writers
func (p *KafkaProducer) Close() error {
	for topic, writer := range p.writers {
		if err := writer.Close(); err != nil {
			p.logger.Printf("Error closing writer for topic %s: %v", topic, err)
		}
	}
	p.logger.Println("✅ Kafka producer closed")
	return nil
}

// IsHealthy checks if the producer is healthy
func (p *KafkaProducer) IsHealthy() bool {
	// Try to get stats from one writer
	for _, writer := range p.writers {
		stats := writer.Stats()
		return stats.Errors == 0 || stats.Writes > 0
	}
	return false
}
