package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

// KafkaProducer handles Kafka message production
type KafkaProducer struct {
	writers map[string]*kafka.Writer
	logger  *zap.Logger
	mu      sync.RWMutex
}

// NewKafkaProducer creates a new Kafka producer
func NewKafkaProducer(brokers []string, logger *zap.Logger) *KafkaProducer {
	writers := make(map[string]*kafka.Writer)

	topics := []string{
		TopicMarketDataTicker,
		TopicMarketDataOrderbook,
		TopicMarketDataTrades,
		TopicMarketDataKline,
		TopicMarketDataMarketInfo,
		TopicMarketDataNFT,
		TopicMarketDataRWA,
		TopicOrderbookSnapshots,
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
			RequiredAcks: kafka.RequireAll,
			Async:        false,
		}
	}

	logger.Info("✅ Kafka producer initialized", zap.Int("topics", len(topics)))
	return &KafkaProducer{writers: writers, logger: logger}
}


// Produce sends a message to a topic
func (p *KafkaProducer) Produce(ctx context.Context, topic, key string, message interface{}) error {
	p.mu.RLock()
	writer, ok := p.writers[topic]
	p.mu.RUnlock()

	if !ok {
		return fmt.Errorf("no writer for topic: %s", topic)
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
			{Key: "producer", Value: []byte("market-data-service")},
		},
	}

	if err := writer.WriteMessages(ctx, msg); err != nil {
		p.logger.Error("Failed to produce message", zap.String("topic", topic), zap.Error(err))
		return err
	}

	return nil
}

// ProduceTicker publishes ticker data
func (p *KafkaProducer) ProduceTicker(ctx context.Context, ticker interface{}, pair string) error {
	return p.Produce(ctx, TopicMarketDataTicker, pair, ticker)
}

// ProduceOrderbook publishes orderbook data
func (p *KafkaProducer) ProduceOrderbook(ctx context.Context, orderbook interface{}, pair string) error {
	return p.Produce(ctx, TopicMarketDataOrderbook, pair, orderbook)
}

// ProduceTrade publishes trade data
func (p *KafkaProducer) ProduceTrade(ctx context.Context, trade interface{}, pair string) error {
	return p.Produce(ctx, TopicMarketDataTrades, pair, trade)
}

// ProduceKline publishes kline/candlestick data
func (p *KafkaProducer) ProduceKline(ctx context.Context, kline interface{}, pair string) error {
	return p.Produce(ctx, TopicMarketDataKline, pair, kline)
}

// Close closes all Kafka writers
func (p *KafkaProducer) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	for topic, writer := range p.writers {
		if err := writer.Close(); err != nil {
			p.logger.Error("Failed to close writer", zap.String("topic", topic), zap.Error(err))
		}
	}
	p.logger.Info("✅ Kafka producer closed")
	return nil
}

// IsHealthy checks if the producer is healthy
func (p *KafkaProducer) IsHealthy() bool {
	p.mu.RLock()
	defer p.mu.RUnlock()
	for _, writer := range p.writers {
		stats := writer.Stats()
		if stats.Errors > 0 && stats.Writes == 0 {
			return false
		}
	}
	return true
}


// KafkaConsumer handles Kafka message consumption
type KafkaConsumer struct {
	brokers       []string
	consumerGroup string
	readers       map[string]*kafka.Reader
	logger        *zap.Logger
	mu            sync.RWMutex
}

// NewKafkaConsumer creates a new Kafka consumer
func NewKafkaConsumer(brokers []string, consumerGroup string, logger *zap.Logger) *KafkaConsumer {
	return &KafkaConsumer{
		brokers:       brokers,
		consumerGroup: consumerGroup,
		readers:       make(map[string]*kafka.Reader),
		logger:        logger,
	}
}

// Subscribe subscribes to a topic
func (c *KafkaConsumer) Subscribe(ctx context.Context, topic string, handler func([]byte) error) error {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        c.brokers,
		Topic:          topic,
		GroupID:        c.consumerGroup,
		MinBytes:       10e3, // 10KB
		MaxBytes:       10e6, // 10MB
		CommitInterval: time.Second,
		StartOffset:    kafka.LastOffset,
	})

	c.mu.Lock()
	c.readers[topic] = reader
	c.mu.Unlock()

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			default:
				msg, err := reader.ReadMessage(ctx)
				if err != nil {
					if ctx.Err() != nil {
						return
					}
					c.logger.Error("Failed to read message", zap.String("topic", topic), zap.Error(err))
					continue
				}

				if err := handler(msg.Value); err != nil {
					c.logger.Error("Failed to handle message", zap.String("topic", topic), zap.Error(err))
				}
			}
		}
	}()

	c.logger.Info("✅ Subscribed to Kafka topic", zap.String("topic", topic))
	return nil
}

// Close closes all Kafka readers
func (c *KafkaConsumer) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	for topic, reader := range c.readers {
		if err := reader.Close(); err != nil {
			c.logger.Error("Failed to close reader", zap.String("topic", topic), zap.Error(err))
		}
	}
	c.logger.Info("✅ Kafka consumer closed")
	return nil
}
