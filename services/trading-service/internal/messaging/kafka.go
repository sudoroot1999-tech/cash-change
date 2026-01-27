package messaging

import (
	"context"
	"encoding/json"
	"time"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

// KafkaProducer handles Kafka message production
type KafkaProducer struct {
	writers map[string]*kafka.Writer
	brokers []string
	logger  *zap.Logger
}

// KafkaConsumer handles Kafka message consumption
type KafkaConsumer struct {
	readers map[string]*kafka.Reader
	brokers []string
	groupID string
	logger  *zap.Logger
}

// NewKafkaProducer creates a new Kafka producer
func NewKafkaProducer(brokers []string, logger *zap.Logger) *KafkaProducer {
	return &KafkaProducer{
		writers: make(map[string]*kafka.Writer),
		brokers: brokers,
		logger:  logger,
	}
}

// getWriter returns or creates a writer for a topic
func (p *KafkaProducer) getWriter(topic string) *kafka.Writer {
	if w, ok := p.writers[topic]; ok {
		return w
	}

	w := &kafka.Writer{
		Addr:         kafka.TCP(p.brokers...),
		Topic:        topic,
		Balancer:     &kafka.LeastBytes{},
		BatchSize:    100,
		BatchTimeout: 10 * time.Millisecond,
		Async:        true,
		RequiredAcks: kafka.RequireOne,
	}
	p.writers[topic] = w
	return w
}

// Publish publishes a message to a Kafka topic
func (p *KafkaProducer) Publish(ctx context.Context, topic string, key string, message interface{}) error {
	data, err := json.Marshal(message)
	if err != nil {
		return err
	}

	writer := p.getWriter(topic)
	return writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(key),
		Value: data,
		Time:  time.Now(),
	})
}

// PublishOrderEvent publishes an order event
func (p *KafkaProducer) PublishOrderEvent(ctx context.Context, order interface{}) error {
	return p.Publish(ctx, TopicTradingEvents, "order", order)
}

// PublishTradeEvent publishes a trade event
func (p *KafkaProducer) PublishTradeEvent(ctx context.Context, trade interface{}) error {
	return p.Publish(ctx, TopicTradingEvents, "trade", trade)
}

// PublishPositionEvent publishes a position event
func (p *KafkaProducer) PublishPositionEvent(ctx context.Context, position interface{}) error {
	return p.Publish(ctx, TopicTradingEvents, "position", position)
}

// Close closes all Kafka writers
func (p *KafkaProducer) Close() error {
	for _, w := range p.writers {
		if err := w.Close(); err != nil {
			p.logger.Error("Failed to close Kafka writer", zap.Error(err))
		}
	}
	return nil
}

// NewKafkaConsumer creates a new Kafka consumer
func NewKafkaConsumer(brokers []string, groupID string, logger *zap.Logger) *KafkaConsumer {
	return &KafkaConsumer{
		readers: make(map[string]*kafka.Reader),
		brokers: brokers,
		groupID: groupID,
		logger:  logger,
	}
}

// Subscribe subscribes to a Kafka topic
func (c *KafkaConsumer) Subscribe(ctx context.Context, topic string, handler func([]byte) error) error {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        c.brokers,
		Topic:          topic,
		GroupID:        c.groupID,
		MinBytes:       10e3,
		MaxBytes:       10e6,
		CommitInterval: time.Second,
		StartOffset:    kafka.LastOffset,
	})
	c.readers[topic] = reader

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
					c.logger.Error("Failed to read Kafka message", zap.Error(err))
					continue
				}

				if err := handler(msg.Value); err != nil {
					c.logger.Error("Failed to handle Kafka message",
						zap.Error(err),
						zap.String("topic", topic),
					)
				}
			}
		}
	}()

	c.logger.Info("✅ Subscribed to Kafka topic", zap.String("topic", topic))
	return nil
}

// Close closes all Kafka readers
func (c *KafkaConsumer) Close() error {
	for _, r := range c.readers {
		if err := r.Close(); err != nil {
			c.logger.Error("Failed to close Kafka reader", zap.Error(err))
		}
	}
	return nil
}
