package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/trading-platform/market-data-service/internal/services"
	"go.uber.org/zap"
)

// HTTPServer is the HTTP API server
type HTTPServer struct {
	service *services.MarketDataService
	router  *mux.Router
	logger  *zap.Logger
}

// NewHTTPServer creates a new HTTP server
func NewHTTPServer(service *services.MarketDataService, logger *zap.Logger) *HTTPServer {
	server := &HTTPServer{
		service: service,
		router:  mux.NewRouter(),
		logger:  logger,
	}

	server.setupRoutes()
	return server
}

func (s *HTTPServer) setupRoutes() {
	// Health check
	s.router.HandleFunc("/health", s.handleHealth).Methods("GET")

	// API v1
	api := s.router.PathPrefix("/api/v1").Subrouter()

	// Ticker endpoints
	api.HandleFunc("/ticker/{pair}", s.handleGetTicker).Methods("GET")
	api.HandleFunc("/tickers", s.handleGetTickers).Methods("GET")

	// Orderbook endpoints
	api.HandleFunc("/orderbook/{pair}", s.handleGetOrderbook).Methods("GET")

	// Kline endpoints
	api.HandleFunc("/klines/{pair}", s.handleGetKlines).Methods("GET")

	// Trade endpoints
	api.HandleFunc("/trades/{pair}", s.handleGetTrades).Methods("GET")

	// Market info endpoints
	api.HandleFunc("/market-info/{symbol}", s.handleGetMarketInfo).Methods("GET")

	// Trading pairs
	api.HandleFunc("/trading-pairs", s.handleGetTradingPairs).Methods("GET")

	// Metrics
	api.HandleFunc("/metrics", s.handleMetrics).Methods("GET")

	// Add CORS middleware
	s.router.Use(corsMiddleware)
}

// Start starts the HTTP server
func (s *HTTPServer) Start(port string) error {
	s.logger.Info("✅ HTTP server starting", zap.String("port", port))
	return http.ListenAndServe(":"+port, s.router)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *HTTPServer) writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (s *HTTPServer) writeError(w http.ResponseWriter, status int, message string) {
	s.writeJSON(w, status, map[string]string{"error": message})
}


// Handler implementations

func (s *HTTPServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	health := s.service.HealthCheck(r.Context())
	s.writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  "healthy",
		"details": health,
	})
}

func (s *HTTPServer) handleGetTicker(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pair := strings.ToUpper(vars["pair"])

	ticker, err := s.service.GetTicker(r.Context(), pair)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.writeJSON(w, http.StatusOK, ticker)
}

func (s *HTTPServer) handleGetTickers(w http.ResponseWriter, r *http.Request) {
	pairsParam := r.URL.Query().Get("pairs")
	var pairs []string
	if pairsParam != "" {
		pairs = strings.Split(strings.ToUpper(pairsParam), ",")
	}

	tickers, err := s.service.GetTickers(r.Context(), pairs)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.writeJSON(w, http.StatusOK, map[string]interface{}{
		"tickers": tickers,
		"count":   len(tickers),
	})
}

func (s *HTTPServer) handleGetOrderbook(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pair := strings.ToUpper(vars["pair"])

	limit := 100
	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil {
			limit = l
		}
	}

	orderbook, err := s.service.GetOrderbook(r.Context(), pair, limit)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.writeJSON(w, http.StatusOK, orderbook)
}

func (s *HTTPServer) handleGetKlines(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pair := strings.ToUpper(vars["pair"])

	interval := r.URL.Query().Get("interval")
	if interval == "" {
		interval = "1h"
	}

	limit := 500
	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil {
			limit = l
		}
	}

	klines, err := s.service.GetKlines(r.Context(), pair, interval, limit)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.writeJSON(w, http.StatusOK, map[string]interface{}{
		"klines":   klines,
		"count":    len(klines),
		"interval": interval,
	})
}

func (s *HTTPServer) handleGetTrades(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pair := strings.ToUpper(vars["pair"])

	limit := 100
	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil {
			limit = l
		}
	}

	trades, err := s.service.GetRecentTrades(r.Context(), pair, limit)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.writeJSON(w, http.StatusOK, map[string]interface{}{
		"trades": trades,
		"count":  len(trades),
	})
}

func (s *HTTPServer) handleGetMarketInfo(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	symbol := strings.ToUpper(vars["symbol"])

	info, err := s.service.GetMarketInfo(r.Context(), symbol)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.writeJSON(w, http.StatusOK, info)
}

func (s *HTTPServer) handleGetTradingPairs(w http.ResponseWriter, r *http.Request) {
	pairs := s.service.GetTradingPairs()
	s.writeJSON(w, http.StatusOK, map[string]interface{}{
		"pairs": pairs,
		"count": len(pairs),
	})
}

func (s *HTTPServer) handleMetrics(w http.ResponseWriter, r *http.Request) {
	health := s.service.HealthCheck(r.Context())
	s.writeJSON(w, http.StatusOK, health)
}
