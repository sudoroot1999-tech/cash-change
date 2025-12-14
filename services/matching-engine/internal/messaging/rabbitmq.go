package messaging

import (
	"context"
	"encoding/json"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/exchange/matching-engine/internal/engine"
	"go.uber.org/zap"
)

const (
	ordersExchange      = "orders.exchange"
	tradesExchange      = "trades.exchange"
	ordersQueue         = "orders.created"
	tradesQueue         = "trades.executed"
)

// RabbitMQ manages RabbitMQ connections
type RabbitMQ struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	logger  *zap.Logger
}

// NewRabbitMQ creates a new RabbitMQ connection
func NewRabbitMQ(url string, logger *zap.Logger) (*RabbitMQ, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}

	mq := &RabbitMQ{
		conn:    conn,
		channel: ch,
		logger:  logger,
	}

	// Declare exchanges
	if err := mq.declareExchange(ordersExchange); err != nil {
		return nil, err
	}
	if err := mq.declareExchange(tradesExchange); err != nil {
		return nil, err
	}

	// Declare queues
	if err := mq.declareQueue(ordersQueue, ordersExchange); err != nil {
		return nil, err
	}
	if err := mq.declareQueue(tradesQueue, tradesExchange); err != nil {
		return nil, err
	}

	return mq, nil
}

func (mq *RabbitMQ) declareExchange(name string) error {
	return mq.channel.ExchangeDeclare(
		name,
		"topic",
		true,  // durable
		false, // auto-delete
		false, // internal
		false, // no-wait
		nil,
	)
}

func (mq *RabbitMQ) declareQueue(name, exchange string) error {
	q, err := mq.channel.QueueDeclare(
		name,
		true,  // durable
		false, // auto-delete
		false, // exclusive
		false, // no-wait
		nil,
	)
	if err != nil {
		return err
	}

	return mq.channel.QueueBind(q.Name, "#", exchange, false, nil)
}

// Close closes the connection
func (mq *RabbitMQ) Close() {
	if mq.channel != nil {
		mq.channel.Close()
	}
	if mq.conn != nil {
		mq.conn.Close()
	}
}

// OrderMessage represents an order from the queue
type OrderMessage struct {
	ID            string `json:"id"`
	UserID        string `json:"userId"`
	Symbol        string `json:"symbol"`
	Side          string `json:"side"`
	Type          string `json:"type"`
	Price         string `json:"price"`
	Quantity      string `json:"quantity"`
	StopPrice     string `json:"stopPrice"`
	TimeInForce   string `json:"timeInForce"`
	ClientOrderID string `json:"clientOrderId"`
}

// ConsumeOrders starts consuming orders from the queue
func (mq *RabbitMQ) ConsumeOrders(me *engine.MatchingEngine) {
	msgs, err := mq.channel.Consume(
		ordersQueue,
		"",    // consumer
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,
	)
	if err != nil {
		mq.logger.Error("Failed to start consuming", zap.Error(err))
		return
	}

	mq.logger.Info("Started consuming orders from queue")

	for msg := range msgs {
		var orderMsg OrderMessage
		if err := json.Unmarshal(msg.Body, &orderMsg); err != nil {
			mq.logger.Error("Failed to unmarshal order", zap.Error(err))
			msg.Nack(false, false)
			continue
		}

		// Process order
		// Convert to engine.Order and submit
		mq.logger.Debug("Received order", zap.String("orderId", orderMsg.ID))

		msg.Ack(false)
	}
}

// PublishTrade publishes a trade to the trades exchange
func (mq *RabbitMQ) PublishTrade(trade *engine.Trade) error {
	body, err := json.Marshal(trade)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return mq.channel.PublishWithContext(
		ctx,
		tradesExchange,
		trade.Symbol,
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Body:         body,
		},
	)
}
