package api

import (
	"encoding/json"
	"net/http"
	"time"

	httpSwagger "github.com/swaggo/http-swagger"
	"go.uber.org/zap"
)

// @title Matching Engine API
// @version 1.0
// @description High-performance order matching engine with WebSocket support
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@cryptoexchange.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

// Server handles HTTP API requests
type Server struct {
	logger *zap.Logger
	mux    *http.ServeMux
}

// HealthResponse represents health check response
type HealthResponse struct {
	Status    string    `json:"status"`
	Service   string    `json:"service"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version"`
}

// MetricsResponse represents metrics response
type MetricsResponse struct {
	TotalOrders      int64   `json:"total_orders"`
	TotalMatches     int64   `json:"total_matches"`
	ActiveOrderBooks int     `json:"active_order_books"`
	Uptime           string  `json:"uptime"`
	MatchRate        float64 `json:"match_rate_per_second"`
}

// NewServer creates a new API server
func NewServer(logger *zap.Logger) *Server {
	s := &Server{
		logger: logger,
		mux:    http.NewServeMux(),
	}
	s.setupRoutes()
	return s
}

// setupRoutes configures all API routes
func (s *Server) setupRoutes() {
	// Swagger documentation
	s.mux.HandleFunc("/swagger/", httpSwagger.WrapHandler)
	
	// API routes
	s.mux.HandleFunc("/api/v1/health", s.handleHealth)
	s.mux.HandleFunc("/api/v1/metrics", s.handleMetrics)
	s.mux.HandleFunc("/api/v1/orderbooks", s.handleOrderBooks)
}

// handleHealth godoc
// @Summary Health check
// @Description Check the health status of the matching engine
// @Tags health
// @Produce json
// @Success 200 {object} HealthResponse
// @Router /health [get]
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	response := HealthResponse{
		Status:    "healthy",
		Service:   "matching-engine",
		Timestamp: time.Now(),
		Version:   "1.0.0",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleMetrics godoc
// @Summary Get engine metrics
// @Description Retrieve real-time metrics from the matching engine
// @Tags metrics
// @Produce json
// @Success 200 {object} MetricsResponse
// @Router /metrics [get]
func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// TODO: Get actual metrics from engine
	response := MetricsResponse{
		TotalOrders:      0,
		TotalMatches:     0,
		ActiveOrderBooks: 0,
		Uptime:           "0s",
		MatchRate:        0.0,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleOrderBooks godoc
// @Summary Get order books
// @Description Retrieve list of active order books
// @Tags orderbook
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /orderbooks [get]
func (s *Server) handleOrderBooks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	response := map[string]interface{}{
		"orderbooks": []string{},
		"count":      0,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Start starts the HTTP server
func (s *Server) Start(port string) error {
	s.logger.Info("Starting HTTP API server", zap.String("port", port))
	return http.ListenAndServe(":"+port, s.mux)
}
