package websocket

import (
	"net/http"

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

// Server handles WebSocket connections
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
	http.HandleFunc("/health", s.handleHealth)

	s.logger.Info("Starting WebSocket server", zap.String("port", port))
	return http.ListenAndServe(":"+port, nil)
}

// handleWebSocket handles WebSocket upgrade requests
func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Error("Failed to upgrade connection", zap.Error(err))
		return
	}

	client := NewClient(s.hub, conn, s.logger)
	s.hub.register <- client

	go client.WritePump()
	go client.ReadPump()
}

// handleHealth handles health check requests
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}
