package websocket

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512 * 1024
)

// Client represents a WebSocket client
type Client struct {
	ID     string
	UserID string
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	logger *zap.Logger
}

// NewClient creates a new WebSocket client
func NewClient(hub *Hub, conn *websocket.Conn, logger *zap.Logger) *Client {
	return &Client{
		ID:     uuid.New().String(),
		hub:    hub,
		conn:   conn,
		send:   make(chan []byte, 256),
		logger: logger,
	}
}

// ReadPump pumps messages from the WebSocket connection to the hub
func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.logger.Error("WebSocket error", zap.Error(err))
			}
			break
		}

		c.handleMessage(message)
	}
}

// WritePump pumps messages from the hub to the WebSocket connection
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
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
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage handles incoming WebSocket messages
func (c *Client) handleMessage(message []byte) {
	var msg struct {
		Action  string `json:"action"`
		Channel string `json:"channel"`
		Symbol  string `json:"symbol"`
		UserID  string `json:"userId"`
	}

	if err := json.Unmarshal(message, &msg); err != nil {
		c.logger.Error("Failed to unmarshal message", zap.Error(err))
		return
	}

	switch msg.Action {
	case "subscribe":
		c.hub.Subscribe(c, msg.Channel, msg.Symbol)
		c.sendAck("subscribed", msg.Channel, msg.Symbol)

	case "unsubscribe":
		c.hub.Unsubscribe(c, msg.Channel, msg.Symbol)
		c.sendAck("unsubscribed", msg.Channel, msg.Symbol)

	case "auth":
		c.UserID = msg.UserID
		c.hub.Subscribe(c, "user", msg.UserID)
		c.sendAck("authenticated", "user", msg.UserID)
	}
}

func (c *Client) sendAck(action, channel, symbol string) {
	ack := map[string]string{
		"type":    "ack",
		"action":  action,
		"channel": channel,
		"symbol":  symbol,
	}
	data, _ := json.Marshal(ack)
	c.send <- data
}
