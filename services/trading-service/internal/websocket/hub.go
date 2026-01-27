package websocket

import (
	"encoding/json"
	"sync"

	"github.com/trading-platform/trading-service/internal/types"
	"go.uber.org/zap"
)

// Hub maintains active WebSocket connections
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
	logger     *zap.Logger

	// Subscriptions
	tickerSubs    map[string]map[*Client]bool
	orderbookSubs map[string]map[*Client]bool
	tradeSubs     map[string]map[*Client]bool
	userSubs      map[string]map[*Client]bool // user-specific subscriptions
}

// NewHub creates a new WebSocket hub
func NewHub(logger *zap.Logger) *Hub {
	return &Hub{
		clients:       make(map[*Client]bool),
		broadcast:     make(chan []byte, 256),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		tickerSubs:    make(map[string]map[*Client]bool),
		orderbookSubs: make(map[string]map[*Client]bool),
		tradeSubs:     make(map[string]map[*Client]bool),
		userSubs:      make(map[string]map[*Client]bool),
		logger:        logger,
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			h.logger.Info("Client connected", zap.String("id", client.ID))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				h.removeClientFromSubs(client)
			}
			h.mu.Unlock()
			h.logger.Info("Client disconnected", zap.String("id", client.ID))

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Subscribe subscribes a client to a channel
func (h *Hub) Subscribe(client *Client, channel, symbol string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	var subs map[string]map[*Client]bool
	switch channel {
	case "ticker":
		subs = h.tickerSubs
	case "orderbook":
		subs = h.orderbookSubs
	case "trades":
		subs = h.tradeSubs
	case "user":
		subs = h.userSubs
	default:
		return
	}

	if subs[symbol] == nil {
		subs[symbol] = make(map[*Client]bool)
	}
	subs[symbol][client] = true

	h.logger.Debug("Client subscribed",
		zap.String("client", client.ID),
		zap.String("channel", channel),
		zap.String("symbol", symbol),
	)
}

// Unsubscribe unsubscribes a client from a channel
func (h *Hub) Unsubscribe(client *Client, channel, symbol string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	var subs map[string]map[*Client]bool
	switch channel {
	case "ticker":
		subs = h.tickerSubs
	case "orderbook":
		subs = h.orderbookSubs
	case "trades":
		subs = h.tradeSubs
	case "user":
		subs = h.userSubs
	default:
		return
	}

	if subs[symbol] != nil {
		delete(subs[symbol], client)
	}
}

// BroadcastTicker broadcasts ticker update to subscribers
func (h *Hub) BroadcastTicker(ticker *types.Ticker) {
	h.mu.RLock()
	clients := h.tickerSubs[ticker.TradingPair]
	h.mu.RUnlock()

	if len(clients) == 0 {
		return
	}

	msg := WSMessage{
		Type:    "ticker",
		Channel: ticker.TradingPair,
		Data:    ticker,
	}
	data, _ := json.Marshal(msg)

	for client := range clients {
		select {
		case client.send <- data:
		default:
		}
	}
}

// BroadcastOrderBook broadcasts order book update to subscribers
func (h *Hub) BroadcastOrderBook(orderBook *types.OrderBook) {
	h.mu.RLock()
	clients := h.orderbookSubs[orderBook.TradingPair]
	h.mu.RUnlock()

	if len(clients) == 0 {
		return
	}

	msg := WSMessage{
		Type:    "orderbook",
		Channel: orderBook.TradingPair,
		Data:    orderBook,
	}
	data, _ := json.Marshal(msg)

	for client := range clients {
		select {
		case client.send <- data:
		default:
		}
	}
}

// BroadcastTrade broadcasts trade to subscribers
func (h *Hub) BroadcastTrade(trade *types.Trade) {
	h.mu.RLock()
	clients := h.tradeSubs[trade.TradingPair]
	h.mu.RUnlock()

	if len(clients) == 0 {
		return
	}

	msg := WSMessage{
		Type:    "trade",
		Channel: trade.TradingPair,
		Data:    trade,
	}
	data, _ := json.Marshal(msg)

	for client := range clients {
		select {
		case client.send <- data:
		default:
		}
	}
}

// BroadcastUserEvent broadcasts user-specific event
func (h *Hub) BroadcastUserEvent(userID string, eventType string, data interface{}) {
	h.mu.RLock()
	clients := h.userSubs[userID]
	h.mu.RUnlock()

	if len(clients) == 0 {
		return
	}

	msg := WSMessage{
		Type:    eventType,
		Channel: userID,
		Data:    data,
	}
	msgData, _ := json.Marshal(msg)

	for client := range clients {
		select {
		case client.send <- msgData:
		default:
		}
	}
}

func (h *Hub) removeClientFromSubs(client *Client) {
	for _, subs := range []map[string]map[*Client]bool{
		h.tickerSubs, h.orderbookSubs, h.tradeSubs, h.userSubs,
	} {
		for symbol := range subs {
			delete(subs[symbol], client)
		}
	}
}

// WSMessage represents a WebSocket message
type WSMessage struct {
	Type    string      `json:"type"`
	Channel string      `json:"channel"`
	Data    interface{} `json:"data"`
}
