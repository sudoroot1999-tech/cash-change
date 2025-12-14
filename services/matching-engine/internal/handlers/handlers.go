package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/exchange/matching-engine/internal/engine"
	"github.com/exchange/matching-engine/internal/messaging"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"
)

// Handler handles HTTP requests
type Handler struct {
	engine    *engine.MatchingEngine
	msgBroker *messaging.RabbitMQ
	logger    *zap.Logger
}

// NewHandler creates a new handler
func NewHandler(e *engine.MatchingEngine, mb *messaging.RabbitMQ, logger *zap.Logger) *Handler {
	return &Handler{
		engine:    e,
		msgBroker: mb,
		logger:    logger,
	}
}

// OrderRequest represents an order submission request
type OrderRequest struct {
	UserID        string `json:"userId" binding:"required"`
	Symbol        string `json:"symbol" binding:"required"`
	Side          string `json:"side" binding:"required,oneof=buy sell"`
	Type          string `json:"type" binding:"required,oneof=market limit stop_loss stop_limit"`
	Price         string `json:"price"`
	Quantity      string `json:"quantity" binding:"required"`
	StopPrice     string `json:"stopPrice"`
	TimeInForce   string `json:"timeInForce"`
	ClientOrderID string `json:"clientOrderId"`
}

// Health check
func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "matching-engine",
	})
}

// Ready check
func (h *Handler) Ready(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

// Live check
func (h *Handler) Live(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "alive"})
}

// SubmitOrder handles order submission
func (h *Handler) SubmitOrder(c *gin.Context) {
	var req OrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse quantities
	quantity, err := decimal.NewFromString(req.Quantity)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid quantity"})
		return
	}

	var price decimal.Decimal
	if req.Type == "limit" || req.Type == "stop_limit" {
		if req.Price == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Price required for limit orders"})
			return
		}
		price, err = decimal.NewFromString(req.Price)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid price"})
			return
		}
	}

	order := &engine.Order{
		UserID:        req.UserID,
		Symbol:        req.Symbol,
		Side:          engine.OrderSide(req.Side),
		Type:          engine.OrderType(req.Type),
		Price:         price,
		Quantity:      quantity,
		TimeInForce:   req.TimeInForce,
		ClientOrderID: req.ClientOrderID,
	}

	if req.StopPrice != "" {
		stopPrice, _ := decimal.NewFromString(req.StopPrice)
		order.StopPrice = stopPrice
	}

	trades, err := h.engine.SubmitOrder(order)
	if err != nil {
		h.logger.Error("Failed to submit order", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process order"})
		return
	}

	// Publish trade events
	if h.msgBroker != nil {
		for _, trade := range trades {
			h.msgBroker.PublishTrade(trade)
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"order":  order,
		"trades": trades,
	})
}

// CancelOrder handles order cancellation
func (h *Handler) CancelOrder(c *gin.Context) {
	orderID := c.Param("id")
	symbol := c.Query("symbol")

	if symbol == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Symbol required"})
		return
	}

	order, err := h.engine.CancelOrder(symbol, orderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel order"})
		return
	}

	if order == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"order": order})
}

// GetOrderBook returns the order book for a symbol
func (h *Handler) GetOrderBook(c *gin.Context) {
	symbol := c.Param("symbol")
	depth := 50 // default depth

	if d := c.Query("depth"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil {
			depth = parsed
		}
	}

	bids, asks := h.engine.GetOrderBook(symbol, depth)

	c.JSON(http.StatusOK, gin.H{
		"symbol": symbol,
		"bids":   bids,
		"asks":   asks,
	})
}

// GetOrderBookDepth returns aggregated depth
func (h *Handler) GetOrderBookDepth(c *gin.Context) {
	symbol := c.Param("symbol")
	bids, asks := h.engine.GetOrderBook(symbol, 100)

	c.JSON(http.StatusOK, gin.H{
		"symbol":     symbol,
		"bids":       bids,
		"asks":       asks,
		"bidCount":   len(bids),
		"askCount":   len(asks),
	})
}

// GetRecentTrades returns recent trades
func (h *Handler) GetRecentTrades(c *gin.Context) {
	symbol := c.Param("symbol")
	limit := 100

	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 1000 {
			limit = parsed
		}
	}

	trades := h.engine.GetRecentTrades(symbol, limit)

	c.JSON(http.StatusOK, gin.H{
		"symbol": symbol,
		"trades": trades,
	})
}

// GetStats returns engine statistics
func (h *Handler) GetStats(c *gin.Context) {
	stats := h.engine.GetStats()
	c.JSON(http.StatusOK, stats)
}
