package kafka

import (
	"context"
	"encoding/json"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/trading-platform/matching-engine/internal/types"
)

const (
	TopicOrderCreated    = "order.created"
	TopicOrderMatched    = "order.matched"
	TopicOrderCancelled  = "order.cancelled"
	TopicTradeExecuted   = "trade.executed"
	TopicPositionLiquidated = "position.liquidated"
)

type Producer struct {
	writers map[string]*kafka.Writer
}

func NewProducer(brokers []string) (*Producer, error) {
	writers := map[string]*kafka.Writer{
		TopicOrderCreated:    newWriter(brokers, TopicOrderCreated),
		TopicOrderMatched:    newWriter(brokers, TopicOrderMatched),
		TopicOrderCancelled:  newWriter(brokers, TopicOrderCancelled),
		TopicTradeExecuted:   newWriter(brokers, TopicTradeExecuted),
		TopicPositionLiquidated: newWriter(brokers, TopicPositionLiquidated),
	}

	return &Producer{writers: writers}, nil
}

func newWriter(brokers []string, topic string) *kafka.Writer {
	return &kafka.Writer{
		Addr:         kafka.TCP(brokers...),
		Topic:        topic,
		Balancer:     &kafka.LeastBytes{},
		BatchSize:    100,
		BatchTimeout: 10 * time.Millisecond,
		Compression:  kafka.Snappy,
	}
}

func (p *Producer) PublishOrderUpdate(order *types.Order) error {
	data, err := json.Marshal(order)
	if err != nil {
		return err
	}

	topic := TopicOrderCreated
	if order.Status == types.OrderStatusCancelled {
		topic = TopicOrderCancelled
	} else if order.Status == types.OrderStatusFilled || order.Status == types.OrderStatusPartiallyFilled {
		topic = TopicOrderMatched
	}

	return p.writers[topic].WriteMessages(context.Background(), kafka.Message{
		Key:   []byte(order.ID.String()),
		Value: data,
		Time:  time.Now(),
	})
}

func (p *Producer) PublishTrade(trade *types.Trade) error {
	data, err := json.Marshal(trade)
	if err != nil {
		return err
	}

	return p.writers[TopicTradeExecuted].WriteMessages(context.Background(), kafka.Message{
		Key:   []byte(trade.ID.String()),
		Value: data,
		Time:  time.Now(),
	})
}

func (p *Producer) PublishLiquidation(liquidation *types.Liquidation) error {
	data, err := json.Marshal(liquidation)
	if err != nil {
		return err
	}

	return p.writers[TopicPositionLiquidated].WriteMessages(context.Background(), kafka.Message{
		Key:   []byte(liquidation.ID.String()),
		Value: data,
		Time:  time.Now(),
	})
}

func (p *Producer) Close() {
	for _, writer := range p.writers {
		writer.Close()
	}
}
