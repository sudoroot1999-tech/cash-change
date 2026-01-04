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
		return true // Allow all origins in production, configure properly
	},
}

func StartServer(hub *Hub, port string, logger *zap.Logger) {
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r, logger)
	})

	logger.Info("WebSocket server starting", zap.String("port", port))
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		logger.Fatal("Failed to start WebSocket server", zap.Error(err))
	}
}

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request, logger *zap.Logger) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("Failed to upgrade connection", zap.Error(err))
		return
	}

	client := NewClient(hub, conn)
	hub.register <- client

	go client.WritePump()
	go client.ReadPump()
}
