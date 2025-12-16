package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/exchange/market-data-service/internal/handlers"
	"github.com/exchange/market-data-service/internal/ticker"
	"github.com/exchange/market-data-service/internal/websocket"
	"go.uber.org/zap"
)

func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	port := os.Getenv("PORT")
	if port == "" {
		port = "3005"
	}

	// Redis connection
	redisURL := strings.TrimSpace(os.Getenv("REDIS_URL"))
	var (
		redisOpts *redis.Options
		err       error
	)
	if redisURL != "" {
		redisOpts, err = redis.ParseURL(redisURL)
		if err != nil {
			logger.Fatal("Invalid REDIS_URL", zap.Error(err))
		}
	} else {
		host := os.Getenv("REDIS_HOST")
		if host == "" {
			host = "redis"
		}
		portStr := os.Getenv("REDIS_PORT")
		if portStr == "" {
			portStr = "6379"
		}
		password := os.Getenv("REDIS_PASSWORD")
		if password == "" {
			// Match docker-compose default when REDIS_PASSWORD is unset
			password = "redis_dev_password"
		}

		redisOpts = &redis.Options{
			Addr:     fmt.Sprintf("%s:%s", host, portStr),
			Password: password,
			DB:       0,
		}
	}
	redisClient := redis.NewClient(redisOpts)
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		logger.Fatal("Redis connection failed", zap.Error(err))
	}

	// Initialize services
	tickerService := ticker.NewTickerService(redisClient, logger)
	wsHub := websocket.NewHub(logger)
	go wsHub.Run()

	// Start ticker updates
	go tickerService.StartUpdates(wsHub)

	// Initialize handlers
	handler := handlers.NewHandler(tickerService, wsHub, logger)

	// Setup router
	if os.Getenv("NODE_ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())

	// Health endpoints
	router.GET("/health", handler.Health)
	router.GET("/health/ready", handler.Ready)
	router.GET("/health/live", handler.Live)

	// API endpoints
	api := router.Group("/api/v1")
	{
		api.GET("/ticker/:symbol", handler.GetTicker)
		api.GET("/ticker", handler.GetAllTickers)
		api.GET("/orderbook/:symbol", handler.GetOrderBook)
		api.GET("/trades/:symbol", handler.GetRecentTrades)
		api.GET("/klines/:symbol", handler.GetKlines)
		api.GET("/ticker/24hr", handler.Get24hrStats)
	}

	// WebSocket endpoint
	router.GET("/ws", func(c *gin.Context) {
		websocket.ServeWs(wsHub, c.Writer, c.Request)
	})

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	go func() {
		logger.Info("Starting Market Data Service", zap.String("port", port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server error", zap.Error(err))
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}
