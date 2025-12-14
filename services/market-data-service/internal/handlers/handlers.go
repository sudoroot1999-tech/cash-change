package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/exchange/market-data-service/internal/ticker"
	"github.com/exchange/market-data-service/internal/websocket"
	"go.uber.org/zap"
)

// Handler handles HTTP requests
type Handler struct {
	tickerService *ticker.TickerService
	wsHub         *websocket.Hub
	logger        *zap.Logger
}

// NewHandler creates a new handler
func NewHandler(ts *ticker.TickerService, hub *websocket.Hub, logger *zap.Logger) *Handler {
	return &Handler{
		tickerService: ts,
		wsHub:         hub,
		logger:        logger,
	}
}

// Health returns health status
func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":     "ok",
		"service":    "market-data-service",
		"wsClients":  h.wsHub.ClientCount(),
	})
}

// Ready returns readiness status
func (h *Handler) Ready(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

// Live returns liveness status
func (h *Handler) Live(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "alive"})
}

// GetTicker returns ticker for a symbol
func (h *Handler) GetTicker(c *gin.Context) {
	symbol := c.Param("symbol")
	t := h.tickerService.GetTicker(symbol)
	if t == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Symbol not found"})
		return
	}
	c.JSON(http.StatusOK, t)
}

// GetAllTickers returns all tickers
func (h *Handler) GetAllTickers(c *gin.Context) {
	tickers := h.tickerService.GetAllTickers()
	c.JSON(http.StatusOK, gin.H{"data": tickers})
}

// Get24hrStats returns 24hr statistics
func (h *Handler) Get24hrStats(c *gin.Context) {
	symbol := c.Query("symbol")
	if symbol != "" {
		t := h.tickerService.GetTicker(symbol)
		if t == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Symbol not found"})
			return
		}
		c.JSON(http.StatusOK, t)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": h.tickerService.GetAllTickers()})
}

// GetOrderBook returns order book for a symbol
func (h *Handler) GetOrderBook(c *gin.Context) {
	symbol := c.Param("symbol")
	depth := 50
	if d := c.Query("depth"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 && parsed <= 100 {
			depth = parsed
		}
	}

	ob := h.tickerService.GetOrderBook(symbol, depth)
	if ob == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Symbol not found"})
		return
	}
	c.JSON(http.StatusOK, ob)
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

	trades := h.tickerService.GetRecentTrades(symbol, limit)
	if trades == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Symbol not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": trades})
}

// GetKlines returns candlestick data
func (h *Handler) GetKlines(c *gin.Context) {
	symbol := c.Param("symbol")
	interval := c.DefaultQuery("interval", "1m")
	limit := 100
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 1000 {
			limit = parsed
		}
	}

	klines := h.tickerService.GetKlines(symbol, interval, limit)
	if klines == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Symbol not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": klines})
}
