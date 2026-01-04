package websocket

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// Client represents a WebSocket client
type Client struct {
	ID            string
	conn          *websocket.Conn
	hub           *Hub
	send          chan []byte
	subscriptions map[string]bool
	mu            sync.RWMutex
}

// Hub maintains the set of active clients
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan *Message
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
	logger     *zap.Logger
}

// Message represents a WebSocket message
type Message struct {
	Type    string      `json:"type"`
	Channel string      `json:"channel"`
	Data    interface{} `json:"data"`
}

// NewHub creates a new Hub
func NewHub(logger *zap.Logger) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan *Message, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		logger:     logger,
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
			}
			h.mu.Unlock()
			h.logger.Info("Client disconnected", zap.String("id", client.ID))

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				// Check if client is subscribed to this channel
				client.mu.RLock()
				subscribed := client.subscriptions[message.Channel] || client.subscriptions["*"]
				client.mu.RUnlock()

				if subscribed {
					data, _ := json.Marshal(message)
					select {
					case client.send <- data:
					default:
						h.mu.RUnlock()
						h.mu.Lock()
						close(client.send)
						delete(h.clients, client)
						h.mu.Unlock()
						h.mu.RLock()
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast sends a message to all subscribed clients
func (h *Hub) Broadcast(channel string, data interface{}) {
	h.broadcast <- &Message{
		Type:    "update",
		Channel: channel,
		Data:    data,
	}
}

// ClientCount returns the number of connected clients
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}


// Server is the WebSocket server
type Server struct {
	hub    *Hub
	logger *zap.Logger
}

// NewServer creates a new WebSocket server
func NewServer(hub *Hub, logger *zap.Logger) *Server {
	return &Server{
		hub:    hub,
		logger: logger,
	}
}

// Start starts the WebSocket server
func (s *Server) Start(port string) error {
	http.HandleFunc("/ws", s.handleWebSocket)
	s.logger.Info("✅ WebSocket server starting", zap.String("port", port))
	return http.ListenAndServe(":"+port, nil)
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Error("Failed to upgrade connection", zap.Error(err))
		return
	}

	client := &Client{
		ID:            generateClientID(),
		conn:          conn,
		hub:           s.hub,
		send:          make(chan []byte, 256),
		subscriptions: make(map[string]bool),
	}

	s.hub.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512 * 1024)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.hub.logger.Error("WebSocket error", zap.Error(err))
			}
			break
		}

		c.handleMessage(message)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current WebSocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) handleMessage(message []byte) {
	var msg struct {
		Action  string   `json:"action"`
		Channel string   `json:"channel"`
		Pairs   []string `json:"pairs"`
	}

	if err := json.Unmarshal(message, &msg); err != nil {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	switch msg.Action {
	case "subscribe":
		if msg.Channel != "" {
			c.subscriptions[msg.Channel] = true
		}
		for _, pair := range msg.Pairs {
			c.subscriptions["ticker:"+pair] = true
			c.subscriptions["orderbook:"+pair] = true
		}

	case "unsubscribe":
		if msg.Channel != "" {
			delete(c.subscriptions, msg.Channel)
		}
		for _, pair := range msg.Pairs {
			delete(c.subscriptions, "ticker:"+pair)
			delete(c.subscriptions, "orderbook:"+pair)
		}
	}

	// Send confirmation
	response, _ := json.Marshal(map[string]interface{}{
		"type":          "subscribed",
		"subscriptions": c.subscriptions,
	})
	c.send <- response
}

func generateClientID() string {
	return time.Now().Format("20060102150405") + "-" + randomString(8)
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
	}
	return string(b)
}
