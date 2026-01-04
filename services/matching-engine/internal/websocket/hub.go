package websocket

import (
	"encoding/json"
	"sync"

	"github.com/trading-platform/matching-engine/internal/types"
	"go.uber.org/zap"
)

type MessageType string

const (
	MessageTypeOrderUpdate      MessageType = "order_update"
	MessageTypeTrade            MessageType = "trade"
	MessageTypeOrderBook        MessageType = "orderbook"
	MessageTypeLiquidation      MessageType = "liquidation"
	MessageTypeSubscribe        MessageType = "subscribe"
	MessageTypeUnsubscribe      MessageType = "unsubscribe"
)

type Message struct {
	Type    MessageType     `json:"type"`
	Data    interface{}     `json:"data"`
	Channel string          `json:"channel,omitempty"`
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan *Message
	register   chan *Client
	unregister chan *Client
	logger     *zap.Logger
	mu         sync.RWMutex
}

func NewHub(logger *zap.Logger) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan *Message, 1000),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		logger:     logger,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			h.logger.Info("Client connected", zap.Int("total_clients", len(h.clients)))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			h.logger.Info("Client disconnected", zap.Int("total_clients", len(h.clients)))

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				// Check if client is subscribed to this channel
				if message.Channel == "" || client.IsSubscribed(message.Channel) {
					select {
					case client.send <- message:
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) BroadcastOrderUpdate(order *types.Order) {
	data, err := json.Marshal(order)
	if err != nil {
		h.logger.Error("Failed to marshal order", zap.Error(err))
		return
	}

	var jsonData interface{}
	json.Unmarshal(data, &jsonData)

	message := &Message{
		Type:    MessageTypeOrderUpdate,
		Data:    jsonData,
		Channel: "orders:" + order.TradingPair,
	}

	h.broadcast <- message
}

func (h *Hub) BroadcastTrade(trade *types.Trade) {
	data, err := json.Marshal(trade)
	if err != nil {
		h.logger.Error("Failed to marshal trade", zap.Error(err))
		return
	}

	var jsonData interface{}
	json.Unmarshal(data, &jsonData)

	message := &Message{
		Type:    MessageTypeTrade,
		Data:    jsonData,
		Channel: "trades:" + trade.TradingPair,
	}

	h.broadcast <- message
}

func (h *Hub) BroadcastOrderBook(orderBook *types.OrderBook) {
	data, err := json.Marshal(orderBook)
	if err != nil {
		h.logger.Error("Failed to marshal orderbook", zap.Error(err))
		return
	}

	var jsonData interface{}
	json.Unmarshal(data, &jsonData)

	message := &Message{
		Type:    MessageTypeOrderBook,
		Data:    jsonData,
		Channel: "orderbook:" + orderBook.TradingPair,
	}

	h.broadcast <- message
}

func (h *Hub) BroadcastLiquidation(liquidation *types.Liquidation) {
	data, err := json.Marshal(liquidation)
	if err != nil {
		h.logger.Error("Failed to marshal liquidation", zap.Error(err))
		return
	}

	var jsonData interface{}
	json.Unmarshal(data, &jsonData)

	message := &Message{
		Type:    MessageTypeLiquidation,
		Data:    jsonData,
		Channel: "liquidations:" + liquidation.TradingPair,
	}

	h.broadcast <- message
}
