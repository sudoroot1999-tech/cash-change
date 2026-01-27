package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/trading-platform/trading-service/internal/services"
	"go.uber.org/zap"
)

// HTTPServer handles HTTP requests
type HTTPServer struct {
	tradingService *services.TradingService
	router         *mux.Router
	logger         *zap.Logger
}

// NewHTTPServer creates a new HTTP server
func NewHTTPServer(tradingService *services.TradingService, logger *zap.Logger) *HTTPServer {
	server := &HTTPServer{
		tradingService: tradingService,
		router:         mux.NewRouter(),
		logger:         logger,
	}
	server.setupRoutes()
	return server
}

func (s *HTTPServer) setupRoutes() {
	// Health check
	s.router.HandleFunc("/health", s.healthCheck).Methods("GET")

	// API v1
	api := s.router.PathPrefix("/api/v1").Subrouter()

	// Orders
	api.HandleFunc("/orders", s.createOrder).Methods("POST")
	api.HandleFunc("/orders/{orderId}", s.getOrder).Methods("GET")
	api.HandleFunc("/orders/{orderId}", s.cancelOrder).Methods("DELETE")
	api.HandleFunc("/orders/open", s.getOpenOrders).Methods("GET")

	// Trades
	api.HandleFunc("/trades/{tradingPair}", s.getTrades).Methods("GET")

	// Positions
	api.HandleFunc("/positions", s.getUserPositions).Methods("GET")
	api.HandleFunc("/positions/{tradingPair}", s.getPosition).Methods("GET")

	// Market data
	api.HandleFunc("/ticker/{tradingPair}", s.getTicker).Methods("GET")
	api.HandleFunc("/orderbook/{tradingPair}", s.getOrderBook).Methods("GET")

	// Middleware
	s.router.Use(s.loggingMiddleware)
	s.router.Use(s.corsMiddleware)
}

// Start starts the HTTP server
func (s *HTTPServer) Start(port string) error {
	s.logger.Info("Starting HTTP server", zap.String("port", port))
	return http.ListenAndServe(":"+port, s.router)
}

// Handlers
func (s *HTTPServer) healthCheck(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func (s *HTTPServer) createOrder(w http.ResponseWriter, r *http.Request) {
	var req services.CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.errorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	order, err := s.tradingService.CreateOrder(r.Context(), &req)
	if err != nil {
		s.errorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	s.jsonResponse(w, http.StatusCreated, order)
}

func (s *HTTPServer) getOrder(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orderID, err := uuid.Parse(vars["orderId"])
	if err != nil {
		s.errorResponse(w, http.StatusBadRequest, "Invalid order ID")
		return
	}

	// TODO: Implement get order
	s.jsonResponse(w, http.StatusOK, map[string]string{"orderId": orderID.String()})
}

func (s *HTTPServer) cancelOrder(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orderID, err := uuid.Parse(vars["orderId"])
	if err != nil {
		s.errorResponse(w, http.StatusBadRequest, "Invalid order ID")
		return
	}

	if err := s.tradingService.CancelOrder(r.Context(), orderID); err != nil {
		s.errorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	s.jsonResponse(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

func (s *HTTPServer) getOpenOrders(w http.ResponseWriter, r *http.Request) {
	userID, err := uuid.Parse(r.URL.Query().Get("userId"))
	if err != nil {
		s.errorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	tradingPair := r.URL.Query().Get("tradingPair")

	orders, err := s.tradingService.GetOpenOrders(r.Context(), userID, tradingPair)
	if err != nil {
		s.errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.jsonResponse(w, http.StatusOK, orders)
}

func (s *HTTPServer) getTrades(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	tradingPair := vars["tradingPair"]

	// TODO: Implement get trades
	s.jsonResponse(w, http.StatusOK, map[string]string{"tradingPair": tradingPair})
}

func (s *HTTPServer) getUserPositions(w http.ResponseWriter, r *http.Request) {
	userID, err := uuid.Parse(r.URL.Query().Get("userId"))
	if err != nil {
		s.errorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	positions, err := s.tradingService.GetUserPositions(r.Context(), userID)
	if err != nil {
		s.errorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.jsonResponse(w, http.StatusOK, positions)
}

func (s *HTTPServer) getPosition(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	tradingPair := vars["tradingPair"]

	userID, err := uuid.Parse(r.URL.Query().Get("userId"))
	if err != nil {
		s.errorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	position, err := s.tradingService.GetPosition(r.Context(), userID, tradingPair)
	if err != nil {
		s.errorResponse(w, http.StatusNotFound, err.Error())
		return
	}

	s.jsonResponse(w, http.StatusOK, position)
}

func (s *HTTPServer) getTicker(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	tradingPair := vars["tradingPair"]

	ticker, err := s.tradingService.GetTicker(r.Context(), tradingPair)
	if err != nil {
		s.errorResponse(w, http.StatusNotFound, err.Error())
		return
	}

	s.jsonResponse(w, http.StatusOK, ticker)
}

func (s *HTTPServer) getOrderBook(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	tradingPair := vars["tradingPair"]

	depth := 20
	if d := r.URL.Query().Get("depth"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil {
			depth = parsed
		}
	}

	orderBook, err := s.tradingService.GetOrderBook(r.Context(), tradingPair, depth)
	if err != nil {
		s.errorResponse(w, http.StatusNotFound, err.Error())
		return
	}

	s.jsonResponse(w, http.StatusOK, orderBook)
}

// Helper methods
func (s *HTTPServer) jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (s *HTTPServer) errorResponse(w http.ResponseWriter, status int, message string) {
	s.jsonResponse(w, status, map[string]string{"error": message})
}

// Middleware
func (s *HTTPServer) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.logger.Info("HTTP request",
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
		)
		next.ServeHTTP(w, r)
	})
}

func (s *HTTPServer) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
