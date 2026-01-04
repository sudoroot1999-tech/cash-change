package kafka

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
	"github.com/trading-platform/matching-engine/internal/types"
)

type OrderHandler interface {
	SubmitOrder(*types.Order)
	CancelOrder(orderID uuid.UUID) error
}

type Consumer struct {
	reader  *kafka.Reader
	handler OrderHandler
}

func NewConsumer(brokers []string, groupID string, handler OrderHandler) (*Consumer, error) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  brokers,
		GroupID:  groupID,
		Topic:    "order.incoming",
		MinBytes: 10e3, // 10KB
		MaxBytes: 10e6, // 10MB
	})

	return &Consumer{
		reader:  reader,
		handler: handler,
	}, nil
}

func (c *Consumer) Start(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			msg, err := c.reader.FetchMessage(ctx)
			if err != nil {
				continue
			}

			c.handleMessage(msg)
			c.reader.CommitMessages(ctx, msg)
		}
	}
}

func (c *Consumer) handleMessage(msg kafka.Message) {
	var order types.Order
	if err := json.Unmarshal(msg.Value, &order); err != nil {
		return
	}

	c.handler.SubmitOrder(&order)
}

func (c *Consumer) Close() {
	c.reader.Close()
}
